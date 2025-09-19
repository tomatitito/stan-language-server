data {
  int<lower=0> N;
  vector[N] y;
  vector[N] x;
}

parameters {
  real alpha;
  real beta;
  real<lower=0> sigma;
}

transformed parameters {
  vector[N] mu = alpha + beta * x;
}

model {
  alpha ~ normal(0, 10);
  beta ~ normal(0, 10);
  sigma ~ exponential(1);
  
  y ~ normal(mu, sigma);
}

generated quantities {
  vector[N] y_rep;
  for (n in 1:N) {
    y_rep[n] = normal_rng(mu[n], sigma);
  }
}