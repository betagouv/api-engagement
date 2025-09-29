#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1

  if [ "$HUSKY" = "0" ]; then
    return
  fi

  command -v sh >/dev/null 2>&1 || {
    echo 'sh is not installed.' >&2
    exit 127
  }

  sh "$@" || exit $?
fi
