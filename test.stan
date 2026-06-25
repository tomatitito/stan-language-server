functions {
  real foo(real x) {
    return x;
  }

  real foo(int x) {
    return x;
  }
}
data {
  // int<lower=0> N;
  // vector[N] x;
  // vector[N] foo;
  // real y;
  int x;
}
parameters {
  real hurz;
  real bom;
  real<lower=0> sigma;
}
model {
  real bar = 1 + 2 + 0932407324 + 02934509 + 3 + 5 + 7;
  // real baz = 1 / 2;
  // foo ~ normal(hurz + bom * x, 1);
  real y = foo(1.0);
  real z = foo(1);
}
