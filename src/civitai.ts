
// import { Mjztool } from "./mjztool";
// Mjztool2.zipContents();

import Mjztool from "./mjztool";

class CivitAI {
    zipContents:any[] = [];

    download():void{
        this.zipContents = [];

        console.info('CivitAI start download...')
        var metadata = {
            title: "",
            url: "",
        };
        //* 1.获取标题文本
        var title = $('h1.mantine-Title-root').text();
        metadata.title = title;
        //* 2.获取网页链接
        var url = location.href;
        metadata.url = url;
      
        //^ 通过api获取模型相关数据
        // 例子：https://civitai.com/api/v1/models/8281
        let requestUrl = 'https://civitai.com/api/v1/models/' + url.match(/\d+/);
        console.log('请求链接: ' + requestUrl);
        fetch(requestUrl)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                this.saveData(data);
        });
    }

    private saveData(data:any):void{
        var zipFileName = data.id;
        var url = window.location.href;
        var modelId = url.match(/\d+/);
        var dataJSON = JSON.stringify(data);
        // saveText(content, modelId, ".json");
  
        // contents.push({path : "", content : ""});
        this.zipContents.push({
            path : modelId + ".json", 
            content : dataJSON, 
            base64: false,
            done: true
        });
  
        var i = 0, count = data.modelVersions.length;
        for (let i = 0; i < data.modelVersions.length; i++) {
            const model = data.modelVersions[i];
            var modelFileName, modelName;
  
            // 获取模型文件名
            if (model.files.length == 1) {
                modelFileName = model.files[0].name;
            } else {
                for (let i = 0; i < model.files.length; i++) {
                    if (model.files[i].type == 'Model') {
                        modelFileName = model.files[i].name;
                    }
                }
            }
            modelName = modelFileName.slice(0, modelFileName.lastIndexOf('.'));
  
            var modelMD = this.modelToMD(model);
            this.zipContents.push({
                path : modelName + "/" + modelFileName + ".md", 
                content : modelMD, done: true});

            var modelJSON = JSON.stringify(model);
            this.zipContents.push({
                path : modelName + "/" + modelFileName + ".json", 
                content : modelJSON, done: true});
  
            for (let p = 0; p < model.images.length; p++) {
                const img = model.images[p];
                var urlsp = img.url.split("/");
                var imgName = urlsp[urlsp.length - 1];
                this.zipContents.push({
                    path : modelName + "/examples/" + imgName + ".json", 
                    content : JSON.stringify(img), done: true});
            }
        }

        this.saveToZip(zipFileName);
    }    
    


    private modelToMD(model:any, md_flag:boolean = true){
        var content = '';
        // localStorage.getItem("md_flag") == "1"

        //* 4.获取预览图片信息
        var examples = '';
        var pictures = model.images;
        for (let j = 0; j < pictures.length; j++) {
            let image = pictures[j];
            // 获取图片链接
            let img_url = image.url;

            // 图片ID
            var urlsp = img_url.split("/");
            var imgID = urlsp[urlsp.length - 1];
            var imgName =  (j + 1) + ' - ' + imgID;

            // 获取大图片链接
            var img_big_url = img_url;
            img_big_url = img_url.split("width=")[0];
            img_big_url += 'width=' + image.width + '/' + imgID;

            // 获取该图片json数据
            let img_info = image.meta;
            let msg = '';
            for (let key in img_info) {
                if (key == 'resources') {
                    for (let res in img_info[key]) {
                        msg += "--" + key + ': ' + JSON.stringify(img_info[key][res]) + '\n';
                    }
                    continue;
                }
                msg += "--" + key + ': ' + img_info[key] + '\n';
            }
            if (md_flag) {
                if (msg) {
                    examples += '\n================< ' + imgName + ' >================\n' +
                        '预览图（小）链接: \n' + img_url + '\n' +
                        '预览图（大）链接: \n' + img_big_url + '\n' +
                        '预览图（大）: \n![](' + img_big_url + ')\n参数: \n' + msg;
                } else {
                    examples += '\n================< ' + imgName + ' >================\n' +
                        '预览图（小）链接: \n' + img_url + '\n' +
                        '预览图（大）链接: \n' + img_big_url + '\n' +
                        '预览图（大）: \n![](' + img_big_url + ')\n该图无参数\n';
                }
            }
            else {
                if (msg) {
                    examples += '\n================< ' + imgName + ' >================\n' +
                        '预览图链接: \n' + img_big_url + '\n参数: \n' + msg;
                } else {
                    examples += '\n================< ' + imgName + ' >================\n' +
                        '预览图链接: \n' + img_big_url + '\n该图无参数\n';
                }
            }
        }

        // 数据组合
        content += `## 版本(${model.name})介绍：\n${model.description}\n\n`;
        content += '## 示例：' + examples.replace(/([\\<>])/g, '\\$1');

                       
        return content;
    }

    private saveToZip(zipFileName:string){
        
        if (this.zipContents.length > 0) {
           
           Mjztool.zipContents2(zipFileName, this.zipContents);
        }
    }
};

export default CivitAI