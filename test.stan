data {
  int<lower=0> N;
  vector[N] x;
  vector[N] foo;
}
parameters {
  real hurz;
  real bom;
  real<lower=0> sigma;
}
model {
  real bar = 1 + 2 + 0932407324 + 02934509 + 3 + 5 + 7;
  // real baz = 1 / 2;
  foo ~ normal(hurz + bom * x, 1);
}
