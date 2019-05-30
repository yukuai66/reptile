const superagent = require('superagent'); //模拟请求
const fs = require('fs'); // 载入fs模块
// const moment = require('moment');
const eventproxy = require('eventproxy');  //流程控制

class Geocoding {
  constructor(params) {
    this.ep = new eventproxy();
    this.params = params;
    this.timerGetData = null //限制发送请求的频率的定时器
    //高德地图key

    //当前处理到的地理数据位置
    this.nowItemIndex = 0;

    this.loading = false;
    //同步读取文件
    this.data = JSON.parse(fs.readFileSync(this.params.filePath, 'utf8'));
    this.lastData = JSON.parse(fs.readFileSync(this.params.lastFilePath, 'utf8'));
    this.main();
  }

  main() {
    this.upDateData();
  }

  upDateData() {
    this.timerGetData = setInterval(() => {
      if (this.loading) {
        return;
      }

      let item = this.data[this.nowItemIndex];
      if (!item) { //当没有数据的时候 清空定时器 然后保存文件
        clearInterval(this.timerGetData);
        this.saveFile();
        return;
      }

      if (!item.location) {
        let { title } = item;
        let lastDataItem = this.lastData.find(x => x.title === title);

        //如果昨天数据里有经纬度就用昨天的经纬度 否则从 高德地图获取
        if (lastDataItem.location) {
          item.realAddress = lastDataItem.address;
          item.gridcode = lastDataItem.gridcode; //地理格id
          item.location = lastDataItem.location;
          this.nowItemIndex++
          this.loading = false;
        } else {
          this.loading = true;
          this.getAddressGeo(item.title).then(res => {
            item.realAddress = res.address;
            item.gridcode = res.gridcode; //地理格id
            item.location = res.location;

            this.nowItemIndex++
            this.loading = false;
          });
        }
      }

    }, 100);
  }

  //获取地理编码
  getAddressGeo(name) {
    return new Promise((resolve, reject) => {
      let params = {
        key: "562ee21d01d4057b28f7ee721dc716fd",
        keywords: name,
        city: this.params.city,
        output: "JSON",
        citylimit: true, //仅返回指定城市数据
        extensions: "all"
      }

      superagent.get("https://restapi.amap.com/v3/place/text")
        .query(params)
        .end((err, resp) => {
          //如果返回字段geocodes里没有 location则为没有找到?
          if (resp.body.status === "1") {
            resolve(resp.body.pois[0]);
          }
        })
    })
  }

  saveFile() {
    let content = JSON.stringify(this.data);
    fs.writeFile(this.params.filePath, content);
  }

  //格式化区域与地区名
  formatAddress(data) {
    let str = data.address;
    let area = str.substring(str.indexOf("[") + 1, str.indexOf("]"));
    area = this.trim(area);
    let reg = /([^\s]+)\s.*/; //获取第一个空格前的字符串;
    let text = `${area.match(reg, area)[1]}区${data.title}`;

    return text;
  }

  //去除字符串前后的空格
  trim(str) {
    return str.replace(/(^\s*)|(\s*$)/g, "")
  }
}

// new Geocoding();
module.exports = Geocoding;