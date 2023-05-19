function getPrettyJapanDatetimeString(date) {
  // cancel timezone offset
  const utcDate = new Date(
    date.getTime() + date.getTimezoneOffset() * 60 * 1000
  );
  const japanDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

  const year = japanDate.getFullYear();
  const month = japanDate.getMonth() + 1;
  const day = japanDate.getDate();
  const hourStr = `0${japanDate.getHours()}`.slice(-2);
  const minuteStr = `0${japanDate.getMinutes()}`.slice(-2);
  const secondStr = `0${japanDate.getSeconds()}`.slice(-2);
  return `${year}/${month}/${day} ${hourStr}:${minuteStr}:${secondStr}`;
}

module.exports = { getPrettyJapanDatetimeString };
