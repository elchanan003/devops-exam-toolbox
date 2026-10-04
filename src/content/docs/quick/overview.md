---
title: שליפה מהירה
description: הפקודות הכי נפוצות לכל תחום ב-60 שניות, וטבלת "סדר חירום" לפי סוג התקלה.
sidebar:
  order: 1
---

:::note[בקצרה]
שליפה, לא לימוד: הפקודות שמריצים הכי הרבה, לכל תחום, ולינק לעמוד המלא.
כל פקודה כאן מופיעה בעמוד המלא; הוא מקור האמת.
:::

## סדר חירום

| סוג התקלה | הפקודה הראשונה | עמוד |
|---|---|---|
| Pod לא `Running` / `CrashLoopBackOff` / `Pending` | `kubectl -n <NS> describe pod -l trident.dev/service=<SERVICE>` | [kubernetes](../../kubernetes/overview/) |
| Application לא `Synced`/`Healthy` | `kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}'` | [argocd/operate](../../argocd/operate/) |
| שגיאת render / `YAML parse error` | `helm template <RELEASE> <CHART_DIR> -n <NS> -f <FILE> -f <FILE> --set defaultImageTag=probe` | [helm](../../helm/overview/) |
| `403` / `Access denied` / `repository not found` | `git ls-remote https://oauth2:$(cat <TOKEN_FILE>)@<GITLAB_HOST>/<GROUP>/<REPO>.git HEAD` | [credentials](../../architecture/credentials/) |
| `Synced`+`Healthy` אבל לא עובד | `curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info` | [verify](../../verify/overview/) |

לא מצאת? [טבלת הסימפטומים המלאה](../../debugging/symptoms/).

## Git

```bash title="runs on: any shell"
git status -sb                      # where am I
git switch -c <BRANCH>              # new branch, switch
git add <FILE>                      # stage one file
git commit -m "describe the change" # commit staged
git push -u origin <BRANCH>         # first push of branch
git fetch                           # update remote view
git pull --rebase                   # after non-fast-forward
git log --oneline --graph --all -15 # see the shape
git tag <TAG>                       # lightweight tag
git push origin <TAG>               # tags push separately
git reflog                          # find lost commit
git revert --no-edit <SHA>          # undo pushed commit
```

המלא: [git/overview](../../git/overview/) · [branches](../../git/branches/) · [sync](../../git/sync/) · [undo](../../git/undo/)

## GitLab / CI

```text title="GitLab UI"
Pipelines:   Build -> Pipelines
Job log:     click the job in the graph
Validate:    Build -> Pipeline editor -> Validate
Manual job:  click play on promote:prod
Variables:   Settings -> CI/CD -> Variables
Members:     Manage -> Members
```

```bash title="runs on: any shell"
git ls-remote origin <BRANCH>       # did GitLab get it
git push origin HEAD:<BRANCH>       # push current commit there
```

```yaml title="file: .gitlab-ci.yml"
include:
  - project: "$TRIDENT_GROUP/trident-ci"
    ref: main
    file: pipelines/source.yml
```

המלא: [gitlab/overview](../../gitlab/overview/) · [ci/overview](../../ci/overview/) · [ci/patterns](../../ci/patterns/)

## Docker

```bash title="runs on: VM"
docker build -t <IMAGE>:<CANDIDATE> -f services/<SERVICE>/Dockerfile services/   # context = parent dir
cat <TOKEN_FILE> | docker login -u <USER> --password-stdin <REGISTRY>             # login from file
docker push <IMAGE>:<CANDIDATE>                                                   # push one image
docker logout <REGISTRY>                                                          # drop credentials
docker image ls --format '{{.Repository}}:{{.Tag}}'                               # local images
docker info --format '{{.Driver}}'                                                # blob unknown check
```

המלא: [docker/overview](../../docker/overview/)

## Bash

```bash title="runs on: any shell"
bash -n <FILE>                          # syntax check only
sed -i 's/\r$//' <FILE>                 # strip CRLF
grep -nE ' +$' <FILE>                   # trailing whitespace
bash <FILE>                             # run without +x
env | grep <VAR_NAME>                    # is it set here
```

```bash title="file: scripts/example.sh"
#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: example.sh <ENV>}"    # required argument
DIR="${TRIDENT_LOCAL_DIR:-$HOME/.local/share/trident}"   # default value
```

המלא: [bash/overview](../../bash/overview/) · [snippets](../../bash/snippets/) · [templates](../../bash/templates/)

## Helm

```bash title="runs on: VM"
helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml -f <ENV>.yaml -f versions/<ENV>.yaml   # one -f per file
helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml --set defaultImageTag=probe            # isolate empty tag
helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml -s templates/networking/ingress.yml    # one template
helm template <RELEASE> <CHART_DIR> -n <NS> -f base.yaml | grep '# Source:' | sort -u           # which files render
helm show values <CHART_DIR>                                                                    # settable keys
helm lint <CHART_DIR> -f base.yaml                                                              # lint, not template
```

המלא: [helm/overview](../../helm/overview/) · [values](../../helm/values/) · [testing](../../helm/testing/)

## kubectl

```bash title="runs on: VM"
kubectl -n <NS> get pods -o wide                                   # state, node, IP
kubectl -n <NS> get deploy,sts,svc,ingress,pvc,cm,secret           # all objects
kubectl -n <NS> describe pod -l trident.dev/service=<SERVICE>      # read Events
kubectl -n <NS> get events --sort-by=.lastTimestamp                # newest last
kubectl -n <NS> logs deploy/<SERVICE> --tail=50                    # recent logs
kubectl -n <NS> logs deploy/<SERVICE> --previous                   # before last crash
kubectl -n <NS> exec -it deploy/<SERVICE> -- sh                    # shell inside
kubectl -n <NS> rollout restart deploy/<SERVICE>                   # restart Deployment
kubectl -n <NS> logs <POD> -c <CONTAINER>                          # one container; no logs = never started, use describe
kubectl -n <NS> delete pod <POD>                                   # StatefulSet: broken Pod is not auto-replaced after a Git fix
kubectl -n <NS> delete statefulset <SERVICE>                       # immutable volumeClaimTemplates: delete STS + its PVC,
kubectl -n <NS> delete pvc <PVC>                                   # then manual sync; never delete the StorageClass
kubectl -n <NS> get secret <SECRET> -o jsonpath='{.data}' | jq 'keys'   # key names only
kubectl get sc                                                     # StorageClasses
kubectl -n ingress-nginx get svc                                   # NodePort after 443:
```

המלא: [kubernetes/overview](../../kubernetes/overview/) · [secrets](../../kubernetes/secrets/) · [networking](../../kubernetes/networking/) · [storage-probes](../../kubernetes/storage-probes/)

## Argo CD

```bash title="runs on: VM"
kubectl -n argocd get applications                                                   # all apps
kubectl -n argocd get application <APP> -o jsonpath='{.status.sync.status}/{.status.health.status}{"\n"}'   # sync/health
kubectl -n argocd get application <APP> -o jsonpath='{.status.conditions}{"\n"}'     # why Unknown
kubectl -n argocd get application <APP> -o jsonpath='{.status.operationState.message}{"\n"}'   # last sync message
kubectl -n argocd get application <APP> -o jsonpath='{.status.operationState.finishedAt}{"\n"}' # compare with date
kubectl -n argocd annotate application <APP> argocd.argoproj.io/refresh=hard --overwrite   # re-read Git (does not restart a Failed sync)
kubectl -n argocd patch application <APP> --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"syncStrategy":{"hook":{}}}}}'   # manual sync
kubectl -n argocd get secret <SECRET> -o jsonpath='{.data.url}' | base64 -d; echo   # repo url bytes
kubectl apply -f <FILE>                                                              # root only, once
```

המלא: [argocd/overview](../../argocd/overview/) · [applications](../../argocd/applications/) · [operate](../../argocd/operate/)

## curl / verify

```bash title="runs on: VM"
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info   # version, counters
kubectl -n <NS> get pods                                             # all 1/1 Running
kubectl -n <NS> get pvc                                              # Bound
kubectl -n argocd get applications                                   # Synced/Healthy
git pull --ff-only                                                   # latest versions files
cat apps/trident/versions/<ENV>.yaml                                 # tag per environment
```

המלא: [verify/overview](../../verify/overview/) · [debugging/symptoms](../../debugging/symptoms/)

## Cleanup

```bash title="runs on: VM"
kubectl delete application <APP> -n argocd --ignore-not-found --wait=true   # root first
kubectl delete namespace <NS> --ignore-not-found --wait=true                # also deletes PVC
kubectl delete secret <SECRET> -n argocd --ignore-not-found                 # repo Secrets
kubectl get applications -n argocd                                          # expect none
kubectl get ns                                                              # no project namespaces
```

המלא: [verify/cleanup](../../verify/cleanup/)
