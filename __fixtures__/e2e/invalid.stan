parameters {
  real x;
  // This will cause an error - undefined variable
  real y = undefined_var;
}

model {
  x ~ normal(0, 1);
  // This will cause an error - y is a parameter but used as data
  target += normal_lpdf(y | 0, 1);
  
  // Syntax error - missing semicolon
  z ~ normal(0, 1)
}