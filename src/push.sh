#!/bin/sh

export GIT_AUTHOR_NAME="Gizeta"
export GIT_AUTHOR_EMAIL="0w0@gizeta.tk"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

git checkout master
git add .
git commit -m "chore: autobuild for $(cat dist/version)"
git push "https://${GITHUB_TOKEN}@github.com/kcwikizh/kancolle-main.git" master
