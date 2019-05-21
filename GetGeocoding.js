const superagent = require('superagent'); //模拟请求
const fs = require('fs'); // 载入fs模块
const moment = require('moment');

fs.readFile('data-cs-2019-05-09.json', 'utf8', function (err, data) {
  if (err) console.log(err);
  let jsonData = JSON.parse(data);
  // console.log(jsonData[0])
  // fs.writeFileSync('test1.json', t)
  let params = {
    key: "562ee21d01d4057b28f7ee721dc716fd",
    address: "望城斑马湖长房星珑湾|梦想新天地|雨花武广新城绿地长沙城际空间站",
    city: 0731,
    output: "JSON",
    batch: true,
    callback: (resp) => {
      console.log(resp)
      // console.log(resp)
    }
  }

  superagent.get("https://restapi.amap.com/v3/geocode/geo")
  .query(params)
  .end((err, resp) => {
    console.log(resp.body)
    //如果返回字段geocodes里没有 location则为没有找到?
    if(resp.body.status === "1"){

    }
  })
});