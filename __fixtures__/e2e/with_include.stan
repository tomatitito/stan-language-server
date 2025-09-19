#include functions.stanfunctions

data {
  int N;
  vector[N] y;
}

parameters {
  real mu;
  real<lower=0> sigma;
}

model {
  for (n in 1:N) {
    target += my_log_likelihood(y[n], mu, sigma);
  }
  
  mu ~ normal(0, 1);
  sigma ~ exponential(1);
}