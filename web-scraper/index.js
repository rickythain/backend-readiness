const request = require("request-promise");
const cheerio = require("cheerio");
const express = require("express");

const app = express();
const PORT = 5555;

const NRP = require("node-redis-pubsub");
const nrp = new NRP({
  host: "redis-server",
  PORT: 6379,
  scope: "microservice",
});

// just for test
app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: "Hi! You're connected to web-scraper!" });
});

// listen on channel, call web scraping function
nrp.on("GET_FOREX_INFO", (data) => {
  console.log("get symbol ", data);

  let from = data.symbol.substring(0, 3);
  let to = data.symbol.substring(3, 6);

  scrapeData(from, to).then((data) => {
    // return extracted data
    return nrp.emit("RESPONSE_FOREX_INFO", { data: data });
  });
});

const scrapeData = (from, to) => {
  from = from.toLowerCase();
  to = to.toLowerCase();
  const req_data = request(
    `https://www.dailyfx.com/${from}-${to}`,
    // `https://www.dailyfx.com/usd-jpy`,
    (headers = {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
    }),
    (error, response, html) => {
      if (error) {
        console.error(error);
        return;
      }
    }
  ).then((html) => {
    const $ = cheerio.load(html);

    // get description
    const dataMain = $(".dfx-viewMore");
    const output = dataMain.find(".dfx-viewMore__content").text();

    // get support
    const supportList = $(".dfx-supportResistanceBlock__valuesS.mr-1.mr-md-0");

    const s1 = supportList.find(".dfx-supportResistanceBlock__valueRow");
    const s2 = s1.next();
    const s3 = s2.next();

    const supports = [s1, s2, s3];
    const supportObjs = [];

    supports.forEach((item) => {
      let classes = item.find("div").find("div").attr("class");
      let support = {
        s: item.find(".dfx-supportResistanceBlock__valueName.mx-1").html(),
        value: item.find(".dfx-supportResistanceBlock__valueLevel.mx-1").html(),
        strength: checkStrength(classes),
      };

      supportObjs.push(support);
    });

    // get resistance
    const resistList = $(".dfx-supportResistanceBlock__valuesR.ml-1.ml-md-0");
    const r1 = resistList.find(".dfx-supportResistanceBlock__valueRow");
    const r2 = r1.next();
    const r3 = r2.next();

    const resistances = [r1, r2, r3];
    const resistObjs = [];

    resistances.forEach((item) => {
      let classes = item.find("div").find("div").attr("class");
      let resistance = {
        r: item.find(".dfx-supportResistanceBlock__valueName.mx-1").html(),
        value: item.find(".dfx-supportResistanceBlock__valueLevel.mx-1").html(),
        strength: checkStrength(classes),
      };
      resistObjs.push(resistance);
    });

    // get pivot data
    const pivotTable = $("div").find(".dfx-pivotPointsComponent__tableRow");
    let pivotObjs = [];
    for (let i = 1; i < 9; i++) {
      let node = pivotTable.find(`div:nth-child(${i})`);
      if (node.html()) {
        let pivot = {
          pivot: node.find("span").html().replace(/\s/g, ""),
          point: node.find("span").next().html().replace(/\s/g, ""),
        };
        pivotObjs.push(pivot);
      }
    }

    let symbol = (from + to).toUpperCase();

    let fullData = {
      symbol: symbol,
      description: output,
      stats: {
        support: supportObjs,
        resist: resistObjs,
        pivot: pivotObjs,
      },
    };

    // console.log(fullData);
    return fullData;
  });

  return req_data;
};

const checkStrength = (classes) => {
  let strength = null;
  if (classes.includes("strong")) strength = "strong";
  else if (classes.includes("moderate")) strength = "moderate";
  else if (classes.includes("weak")) strength = "weak";

  return strength;
};

app.listen(PORT, () => {
  console.log(`Server at ${PORT}`);
});
