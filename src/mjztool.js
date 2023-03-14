
function Mjztool (){
  this.bytesToSize = function(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
    //toPrecision(3) 后面保留一位小数，如1.0GB                                                                                                                  //return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];  
  };
  this.matchURL = function(url) {
    const URL = window.location.href;
    return URL.indexOf(url) > -1;
  };
  this.matchUrlList = function(list) {
    var URL = window.location.href;
    for (var index = 0; index < list.length; index++) {
        var url = list[index];
        if (URL.indexOf(url) > -1) {
            return true;
        }
    }
    return false;
  };
  this.matchURLAbsolute = function(url) {
    const href = window.location.href;
    const len = href.length;
    return href.indexOf(url) > -1 && url.length == len;
  };
  this.addStyle = function(styleContent) {
    var elStyle = document.createElement("style");
    elStyle.innerHTML = styleContent;
    document.head.appendChild(elStyle);
  };
  this.addFunction = function(func, name) {
    name = name || func.name;
    document[name] = func;
  };
  this.GM_setClipboard = function(content) {
  // @grant        GM_setClipboard
    GM_setClipboard(content);
  };
  this.appendScriptLink = function(src) {
    var f = document.createElement('script');
    f.src = src;
    document.body.appendChild(f);
  };
  this.appendStyleLink = function(src) {
    var elStyle = document.createElement("link");
    elStyle.rel="stylesheet";
    elStyle.type="text/css";
    elStyle.href = src;
    document.head.appendChild(elStyle);
  };
  this.randomSelect = function(list) {
    var rStart = 0;
    var rEnd = list.length;
    var randomIndex = Math.floor(Math.random() * rEnd + rStart);
    return list[randomIndex];
  };
  this.filterList = function(list, filter, constructor){
    if(!(list instanceof Array)) console.error('param "list" is not Array');
    if(typeof(filter) !== 'function') console.error('param "filter" is not Function');

    var result = [];
    for (var index = 0; index < list.length; index++) {
        var element = list[index];
        if (filter(element, index)) {
            if(typeof(constructor) === 'function'){
                result.push(constructor(element, index));
            }else{
                result.push(element);
            }
        }
    }
    return result;
  };
  this.printIt = function (printThis) {
    var win = window.open();
    win.document.open();
    win.document.write('<html><body style="white-space: pre;">');
    win.document.write(printThis);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
    win.close();
  };

  this.zipContents = function (filename, contents){
    var currDate = new Date();
    var dateWithOffset = new Date(currDate.getTime() - currDate.getTimezoneOffset() * 60000);
    // replace the default date with dateWithOffset
    JSZip.defaults.date = dateWithOffset;

    var zip = new JSZip();
      contents.forEach(function(item){
          zip.file(item.path, item.content, {createFolders:true,base64:true});
      });
      return new Promise(function(res, rej){
        zip.generateAsync({type:"blob"})
        .then(function (content) {
            saveAs(content, filename + ".zip");
            res();
        }, function(error){
            console.log(error);
            rej(error);
        });
      });	
  };



  this.zipContents2 = function (filename, contents){
    var currDate = new Date();
    var dateWithOffset = new Date(currDate.getTime() - currDate.getTimezoneOffset() * 60000);
    // replace the default date with dateWithOffset
    JSZip.defaults.date = dateWithOffset;

    var zip = new JSZip();
      contents.forEach(function(item){
          zip.file(item.path, item.content, {
            createFolders: true,
            base64: item.base64 || false, 
            binary: item.binary || false});
      });
      return new Promise(function(res, rej){
        zip.generateAsync({type:"blob"})
        .then(function (content) {
            saveAs(content, filename + ".zip");
            res();
        }, function(error){
            console.log(error);
            rej(error);
        });
      });	
  };

  this.zipContents = function (filename, contents){
    var zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    var img = zip.folder("images");
    // img.file("smile.gif", imgData, {base64: true});
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // see FileSaver.js
        saveAs(content, "example.zip");
    });
  };

  this.saveText = function(content, fileName, fileExt){
    fileExt = fileExt || '.txt';
    var blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
    });
    // 保存文件
    saveAs(blob, fileName + fileExt);
  };

  // GM_xmlhttpRequest GET异步通用模块
  this.RequestData = function(url, type = "document", usermethod = "GET") {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: usermethod,
        url: url,
        responseType: type,
        onload: function (response) {
          if (response.status == 200) {
            resolve(response.response);
          } else {
            reject(response);
          }
        },
        onerror: function (error) {
          console.log("网络错误");
          reject(error);
        }
      });
    });
  };


}

// module.exports = Mjztool;
// exports.Mjztool = Mjztool;
export default new Mjztool();