// Lightweight stub for 'jose' library during Jest test execution in Node CommonJS.
// Prevents ERR_REQUIRE_ESM / SyntaxError when jwks-rsa requires jose.
module.exports = {
  compactDecrypt: () => ({ plaintext: Buffer.from('mock') }),
  jwtVerify: () => ({ payload: {} }),
  createRemoteJWKSet: () => () => ({}),
};
