const cheerio = require('cheerio');  //dom操作
const superagent = require('superagent'); //模拟请求
const async = require('async'); //异步抓取
const eventproxy = require('eventproxy');  //流程控制
const schedule = require('node-schedule'); //定时任务
const fs = require('fs'); // 载入fs模块
const moment = require('moment');
const getGeocoding = require("./GetGeocoding");

const scheduleCronstyle = () => {
  schedule.scheduleJob('45 1 3 * * *', () => {

    let ep = eventproxy(),
      pageUrls = [];

    function strRe(str) {
      str = str.replace(/<\/?[^>]*>/g, ''); //去除HTML tag
      str = str.replace(/[ | ]*\n/g, '\n'); //去除行尾空白
      str = str.replace(/\n[\s| | ]*\r/g, '\n'); //去除多余空行
      str = str.replace(/ /ig, '');//去掉 
      str = str.replace(/^[\s　]+|[\s　]+$/g, "");//去掉全角半角空格
      str = str.replace(/[\r\n]/g, "");//去掉回车换行

      return str;
    }


    let getFirstPageInfor =
      new Promise(function (resolve) {
        superagent.get("https://hz.fang.anjuke.com/loupan/all/p1/")
          .end((err, pres) => {
            if (err) {
              fs.writeFile(`./log/error-${format("YYYY-MM-DD HH-mm-ss")}.txt`, JSON.stringify(err))
            }
            let $ = cheerio.load(pres.text);
            let count = $(".result em").text(),
              pageNum = $(".item-mod").length - 2,
              pageTotal = parseInt(count / pageNum);

            let dataInfor = {
              count: count,
              pageTotal: pageTotal,
            }
            resolve(dataInfor)
          })
        // resolve({ count: 1288, pageTotal: 2 });
      })

    getFirstPageInfor.then(data => {
      for (let i = 1; i <= data.pageTotal; i++) {
        pageUrls.push(`https://hz.fang.anjuke.com/loupan/all/p${i}/`);
      };


      ep.after('save_file', data.pageTotal, function (list) {

        let newArr = [];
        list.map(data => {
          newArr = [...newArr, ...data]
        })
        let text = JSON.stringify(newArr)
        let filePath = `./hzData/data-hz-${moment().format("YYYY-MM-DD")}.json`;
        let lastFilePath = `./hzData/data-hz-${moment().subtract(1, 'days').format("YYYY-MM-DD")}.json`;
        fs.writeFile(filePath, text, function (err) {
          let geocoding = new getGeocoding({
            filePath: filePath,
            lastFilePath: lastFilePath,
            city: "杭州",
          });
        });
      });

      let num = 0;
      let timer = setInterval(() => {
        if (num >= data.pageTotal) {
          clearInterval(timer);
          return;
        }

        let url = pageUrls[num];
        superagent.get(url)
          .end((err, pres) => {
            let $ = cheerio.load(pres.text),
              len = $(".item-mod").length,
              itemArr = [];

            for (let i = 2; i < len; i++) {
              let nowEl = $(".item-mod").eq(i);
              if (!nowEl.attr("data-link")) continue;

              let doorModalLen = $(".item-mod").eq(2).find(".huxing span").length;
              let saleType = nowEl.find(".tag-panel .status-icon").eq(1).attr("class") && nowEl.find(".tag-panel .status-icon").eq(1).attr("class").split(" ")[1];
              let saleStatus = nowEl.find(".tag-panel .status-icon").eq(0).attr("class") && nowEl.find(".tag-panel .status-icon").eq(0).attr("class").split(" ")[1];
              let item = {
                title: nowEl.find(".items-name").text(),
                address: strRe(nowEl.find(".address").text()),
                saleStatus: saleStatus,
                saleStatusText: nowEl.find(".tag-panel .status-icon").eq(0).text(),
                saleType: saleType,
                saleTypeText: nowEl.find(".tag-panel .status-icon").eq(1).text(),
                doorModel: nowEl.find(".huxing span").slice(0, doorModalLen - 1).text(),
                area: nowEl.find(".huxing span").eq(doorModalLen - 1).text(),
                price: nowEl.find(".price span").text(),
                aroundPrice: nowEl.find(".around-price span").text()
              }

              itemArr.push(item);
            }

            ep.emit('save_file', itemArr);
            num++
          })

      }, 1000);
    })


  });
}

scheduleCronstyle();