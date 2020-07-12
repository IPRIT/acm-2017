import { slowAES } from "./aes";

function toNumbers(e) {
  var f = [];
  e.replace(/(..)/g, function(d) {
    f.push(parseInt(d, 16));
  });
  return f;
}

function toHex() {
  var e = 1 == arguments.length && arguments[0].constructor == Array ? arguments[0] : arguments;
  for (var f = "", d = 0; d < e.length; d++) {
    f += (16 > e[d] ? "0" : "") + e[d].toString(16);
  }
  return f.toLowerCase();
}

function buildProtectionCookie(first, second, third) {
  const a = toNumbers(first),
    b = toNumbers(second),
    c = toNumbers(third);

  return `RCPC=${toHex(slowAES.decrypt(c, 2, a, b))}`;
}

export function getProtectionCookie(responseText = '') {
  if (!responseText.includes('Redirecting...')) {
    return null;
  }

  const regex = /toNumbers\("(\w+)"\)/gi;
  const regexQs = /https:\/\/codeforces\.com\/\?(\w+=\d+)/i;
  const match = responseText.matchAll(regex);
  const qs = responseText.match(regexQs)[1];

  const [first, second, third] = [...match].map(value => value[1]);

  return [
    buildProtectionCookie(first, second, third),
    qs
  ];
}