# econometrics.R
#
# Companion to notebooks/02_forecasting_model.ipynb. The Python forecast predicts
# a trend; this tests a causal question the forecast can't answer on its own:
# does stablecoin supply growth Granger-cause changes in USD reserve share
# (or vice versa, or neither)?
#
# Steps (fill in as you go, don't just run someone else's template):
#   1. Load the same cleaned series used in the Python notebook (data/processed/)
#   2. Test each series for stationarity (Augmented Dickey-Fuller, tseries::adf.test)
#      - if non-stationary, difference it before anything else, note why
#   3. Test for cointegration if both series are integrated of the same order
#      (Engle-Granger two-step, or urca::ca.jo for Johansen if extending to >2 series)
#   4. Granger causality test (lmtest::grangertest or vars::causality) in both
#      directions, at a couple of sensible lag lengths
#   5. Write the honest conclusion in docs/02-literature-review.md, not just here -
#      "no significant Granger causality either direction" is a legitimate, useful
#      finding, don't force a result that isn't there

# install.packages(c("tseries", "urca", "vars", "lmtest"))
library(tseries)
library(urca)
library(vars)
library(lmtest)

# TODO: read in your cleaned series once data/processed/ exists
