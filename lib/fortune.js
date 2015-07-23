var fortuneCookies = [
  "Conquer your fear or they will conquer you.",
  "River need springs.",
  "Do not fear what you don`t know.",
  "You will have a pleasant surprise.",
  "Whenever possible, keep it simple."
];

exports.getFortune = function () {
  var idx = Math.floor(Math.random() * fortuneCookies.length);
  return fortuneCookies[idx];
};