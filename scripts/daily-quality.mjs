import { appendFile } from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY;
const summary = process.env.GITHUB_STEP_SUMMARY;
if (!repo || !summary || !process.env.GH_TOKEN) throw new Error('Missing GitHub workflow context');
const api = async path => {
  const response = await fetch('https://api.github.com/repos/'+repo+path,{
    headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},
    signal:AbortSignal.timeout(15000)
  });
  return response.ok ? {data:await response.json()} : {error:response.status};
};
const [prs,runs,issues,commits,alerts] = await Promise.all([
  api('/pulls?state=open&per_page=12'),
  api('/actions/workflows/ci.yml/runs?per_page=15'),
  api('/issues?state=open&per_page=25'),
  api('/commits?per_page=5'),
  api('/dependabot/alerts?state=open&per_page=15')
]);
const text = value => String(value).replace(/[<>\[\]|`\r\n]/g,' ').slice(0,120);
const bullets = (items,format,missing='无近期条目') => items?.length ? items.map(item=>'- '+format(item)).join('\n') : missing;
const unavailable = query => query.error ? '暂不可读（HTTP '+query.error+'）' : undefined;
const ciRuns = runs.data?.workflow_runs || [];
const failures = ciRuns.filter(run=>run.conclusion==='failure').slice(0,5);
const jobs = await Promise.all(failures.map(async run=>({run,...await api('/actions/runs/'+run.id+'/jobs?filter=latest')})));
const failedLines = jobs.map(({run,data,error})=>{
  const steps=data?.jobs?.flatMap(job=>job.steps.filter(step=>step.conclusion==='failure').map(step=>text(step.name))) || [];
  const classification = steps.length ? steps.join('、') : error ? '分类不可读（HTTP '+error+'）' : '请查看日志';
  return '- [运行 '+run.id+']('+run.html_url+') · '+classification;
});
const output = [
  '## 破风每日质量巡检',
  '### 开放 PR',bullets(prs.data,p=>'[#'+p.number+']('+p.html_url+') '+text(p.title)+(p.draft?' · 草稿':''),unavailable(prs)),
  '### CI、构建和浏览器测试',bullets(ciRuns.slice(0,6),run=>'[运行 '+run.id+']('+run.html_url+') · '+text(run.head_branch)+' · '+(run.conclusion||run.status),unavailable(runs)),
  ...failedLines,
  '### 依赖安全告警',bullets(alerts.data,a=>'['+text(a.dependency.package.name)+']('+a.html_url+') · '+a.security_advisory.severity,unavailable(alerts)),
  '### 待处理事项',bullets(issues.data?.filter(issue=>!issue.pull_request),issue=>'[#'+issue.number+']('+issue.html_url+') '+text(issue.title),unavailable(issues)),
  '### 默认分支的近期变更',bullets(commits.data,c=>'['+c.sha.slice(0,7)+']('+c.html_url+') '+text(c.commit.message.split('\n')[0]),unavailable(commits)),
  '覆盖范围为最近返回的记录。失败步骤可用于定位测试、可用性和性能门槛，原生耗电与真机稳定性另行验收。自动修复执行器未配置。'
].join('\n\n');
await appendFile(summary,output+'\n');
