#!/bin/bash
# developブランチ宛のPR作成時やdevelopブランチ宛のPRが存在するブランチにpushした時にphp_codesnifferを走らせPRに自動的にコメントをつける

# 以下の２つの定数に加えて、GitHubでrepo権限をつけたトークンを発行して
# CircleCIの当該プロジェクトのProject Settings > Environment Variables で GITHUB_ACCESS_TOKEN, REVIEWDOG_GITHUB_API_TOKEN の２つの定数の値に設定

# GitHubのリポジトリ
readonly GITHUB_REPOSITORY="chithang3112/chithang-test-project"
# phpcsの実行を除外するファイル・ディレクトリ。複数指定する際はコンマ区切りで記述（以下参照）
# https://github.com/squizlabs/PHP_CodeSniffer/wiki/Advanced-Usage#ignoring-files-and-folders
readonly IGNORE="tests/*,web/js/react_component/*\.js"


# PullRequestが存在しなければexit 
if [ -z "$CIRCLE_PULL_REQUEST" ]; then
  echo "Pull request does not exist."
  exit 0
fi

# GitHub REST API からPullRequestの情報を取得
pr_number=$(echo $CIRCLE_PULL_REQUEST | grep -oP '[0-9]+$')
response=$(curl -s -w "%{http_code}" -H "Accept: application/vnd.github.v3+json" -H "Authorization: token ${GITHUB_ACCESS_TOKEN}" https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${pr_number})
http_status=$(echo $response | tail -c 4)
body=${response::-3}

# HTTPのステータスコードが200でなければexit
if [ ! "$http_status" = "200" ]; then
  echo "Pull request does not exist."
  exit 0
fi

# PullRequestがopenでなければexit
pr_state=$(echo $body | jq -r '.state')
if [ ! "$pr_state" = "open" ]; then
  echo "This is not an open pull request."
  exit 0
fi

# PullRequestのbaseブランチがdevelopでなければexit
pr_base_branch=$(echo $body | jq -r '.base.ref')
if [ ! "$pr_base_branch" = "develop" ]; then
  echo "This is not a pull request of which base branch is 'develop'."
  exit 0
fi

# 既存のcomposer.json, composer.lockは不要なため削除
rm -f composer.json composer.lock

# squizlabs/php_codesnifferとproseeds/code-snifferのインストール。proseeds/code-snifferのセットアップも行う
composer init -n --repository '{"type":"vcs","url":"https://github.com/proseeds/code-sniffer"}'
composer config -g github-oauth.github.com $GITHUB_ACCESS_TOKEN
composer require -n --dev squizlabs/php_codesniffer:3.5.6
composer require -n --dev proseeds/code-sniffer:dev-master
php -r "require 'vendor/proseeds/code-sniffer/Installer.php'; use Proseeds\CodeSniffer\Installer; Installer::setupStandards();"

# reviewdogのインストール
curl -sfL https://raw.githubusercontent.com/reviewdog/reviewdog/master/install.sh | sh -s -- -b ./bin

# developブランチと差分があるファイルだけphpcsを走らせる
target_files=""
files=$(git diff --name-only remotes/origin/develop $CIRCLE_BRANCH)
while read line ; do
  # 上記のgit diffでは削除されたファイル名も出力されるため、それらはここで取り除く
  if [ -e "$line" ]; then
    target_files+="${line} "
  fi
done <<END
$files
END

# 対象ファイルが１つも無ければ実行しない
if [ -z "$target_files" ]; then
  echo "OK, there is no error."
  exit 0
fi

# phpcsの実行とreviewdogによるレビューへのコメントの実行
# phpcsは対象ファイルの全範囲に走ってエラーを出力するが、reviewdogがPRの差分の箇所のみに絞ってくれるため、それを.circleci/phpcs_error.logに出力している
./vendor/bin/phpcs --standard=Proseeds --report=emacs --ignore=$IGNORE $target_files | ./bin/reviewdog -efm="%f:%l:%c: %m" -reporter=github-pr-review > .circleci/phpcs_error.log
sed -i -e "s#/home/circleci/##g" .circleci/phpcs_error.log

# PRの差分箇所でエラーがあればそれらを出力
if [ -s ".circleci/phpcs_error.log" ]; then
  echo "Found following errors:"
  cat .circleci/phpcs_error.log
  exit 1
else
  echo "OK, there is no error."
  exit 0
fi
