#!/bin/sh

export GIT_AUTHOR_NAME="kcdata-bot[bot]"
export GIT_AUTHOR_EMAIL="34319+kcdata-bot[bot]@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

git checkout master
git add .
git commit -m "chore: autobuild for $(cat dist/version)"
git push "https://${GITHUB_TOKEN}@github.com/kcwikizh/kancolle-main.git" master
