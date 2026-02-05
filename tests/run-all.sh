#!/bin/bash
# run-all.sh — Master test runner for superbot
# Runs all test suites and reports aggregate results
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
SUITES_PASS=0
SUITES_FAIL=0

echo ""
echo -e "${BOLD}========================================${RESET}"
echo -e "${BOLD}       SUPERBOT TEST SUITE${RESET}"
echo -e "${BOLD}========================================${RESET}"
echo ""

TEST_FILES=(
  "test-paths.sh"
  "test-setup.sh"
  "test-scripts.sh"
  "test-dashboard.sh"
  "test-simulation.sh"
)

for test_file in "${TEST_FILES[@]}"; do
  TEST_PATH="$SCRIPT_DIR/$test_file"
  if [[ ! -f "$TEST_PATH" ]]; then
    echo -e "${RED}MISSING${RESET} $test_file"
    ((SUITES_FAIL++))
    continue
  fi

  if [[ ! -x "$TEST_PATH" ]]; then
    echo -e "${YELLOW}NOT EXECUTABLE${RESET} $test_file — fixing..."
    chmod +x "$TEST_PATH"
  fi

  echo -e "${BOLD}--- $test_file ---${RESET}"
  echo ""

  if "$TEST_PATH"; then
    ((SUITES_PASS++))
  else
    ((SUITES_FAIL++))
  fi

  echo ""
done

echo -e "${BOLD}========================================${RESET}"
echo -e "${BOLD}       FINAL RESULTS${RESET}"
echo -e "${BOLD}========================================${RESET}"
echo ""
echo -e "  Suites passed: ${GREEN}$SUITES_PASS${RESET}"
echo -e "  Suites failed: ${RED}$SUITES_FAIL${RESET}"
echo ""

if [[ $SUITES_FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All test suites passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}$SUITES_FAIL test suite(s) failed.${RESET}"
  exit 1
fi
