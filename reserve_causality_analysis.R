# reserve_share_analysis.R
#
# Tests whether global USD reserve share is genuinely trend-stationary
# and whether RMB share exhibits a direct substitution effect against it.
# Data: IMF COFER, world aggregate, manually retrieved (no public API).
#
# Methods:
# - ADF unit root test (Dickey & Fuller, 1979; augmented form: Said &
#   Dickey, 1984)
# - Granger causality, lag fixed a priori at 1, not selected post hoc,
#   per the overfitting/p-hacking concern raised by Bruns & Stern (2019)
# - Logit-transformed OLS substitution regression, following Chinn &
#   Frankel (2007, 2008), as applied in Arslanalp, Eichengreen &
#   Simpson-Bell (2022)

library(httr)
library(jsonlite)
library(tseries)
library(lmtest)

setwd("~/Projects/uae-tokenisation")

# --- Load COFER data ---
cofer <- read.csv("data/raw/cofer_world.csv")

years <- c("X1999","X2000","X2001","X2002","X2003","X2004","X2005","X2006","X2007","X2008",
           "X2009","X2010","X2011","X2012","X2013","X2014","X2015","X2016","X2017","X2018",
           "X2019","X2020","X2021","X2022","X2023","X2024","X2025")

# --- USD share, 1999-2025 ---
usd_share <- cofer[cofer$COUNTRY == "World" &
                     cofer$FXR_CURRENCY == "Claims in US dollar" &
                     cofer$TYPE_OF_TRANSFORMATION == "Shares" &
                     cofer$FREQUENCY == "Annual", ]
usd_values <- as.numeric(usd_share[1, years])
usd_timeseries <- na.omit(data.frame(year = 1999:2025, usd_share = usd_values))

# --- RMB share, 2016-2025 (COFER did not report RMB separately before Q4 2016) ---
rmb_share <- cofer[cofer$COUNTRY == "World" &
                     cofer$FXR_CURRENCY == "Claims in Chinese yuan renminbi" &
                     cofer$TYPE_OF_TRANSFORMATION == "Shares" &
                     cofer$FREQUENCY == "Annual", ]
rmb_values <- as.numeric(rmb_share[1, years])
rmb_timeseries <- na.omit(data.frame(year = 1999:2025, rmb_share = rmb_values))

merged <- merge(usd_timeseries, rmb_timeseries, by = "year")

# --- Stationarity of USD share ---
adf_result <- adf.test(usd_timeseries$usd_share)
print(adf_result)
# p = 0.019: trend-stationary. n = 27; test power is limited at this
# sample size and should be interpreted accordingly.

# --- Granger causality, both directions, lag fixed at 1 ---
print(grangertest(rmb_share ~ usd_share, order = 1, data = merged))
print(grangertest(usd_share ~ rmb_share, order = 1, data = merged))
# Neither direction significant (p = 0.938; p = 0.281). n = 10
# overlapping years; result is inconclusive rather than evidence
# of independence.

# --- Logit-transformed substitution regression ---
merged$usd_logit <- log(merged$usd_share / (100 - merged$usd_share))
merged$rmb_logit <- log(merged$rmb_share / (100 - merged$rmb_share))
merged$usd_logit_lag <- c(NA, merged$usd_logit[1:(nrow(merged)-1)])

model <- lm(usd_logit ~ usd_logit_lag + rmb_logit, data = merged)
print(summary(model))
# USD inertia is large and highly significant (coef ~1.03, p<0.001),
# consistent with the ADF result. The RMB substitution coefficient is
# not significant (p = 0.149). No evidence of a direct substitution
# effect at this sample size; USD dominance appears persistent rather
# than being actively displaced by RMB in this period.