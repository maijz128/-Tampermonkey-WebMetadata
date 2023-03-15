
import Mjztool from "./mjztool";

const json2md = require("json2md")
json2md.converters.text = function (input, json2md) { return input; }

class ZipItem {
    path: string
    content: any
    base64 = false
    binary = false
    id = 0
    done = false
}

class ZipWrap {
    zipContents: ZipItem[] = [];
    zipFileName: string
    timer: any
    checkCount: number

    constructor(zipFileName: string) {
        this.zipFileName = zipFileName;
    }

    pushItem(obj: { path, content, done }): ZipItem {
        return this.newItem(obj.path, obj.content, obj.done);
    }

    newItem(path = '', content = null, done = false): ZipItem {
        var item = new ZipItem();
        item.path = path;
        item.content = content;
        item.done = done;
        this.zipContents.push(item);
        return item;
    }

    newBinaryItem(path = '', content = null, done = false): ZipItem {
        var item = this.newItem(path, content, done);
        item.binary = true;
        return item;
    }

    saveAsync(duration: number = 60000): void {
        clearInterval(this.timer);
        this.checkCount = duration / 500;
        var self = this;
        this.timer = setInterval(function () {
            self.saveToZip()
        }, 500);
    }

    private saveToZip() {
        var allDone = false;
        this.checkCount -= 1;
        if (this.zipContents.length > 0) {
            allDone = true;
            for (let i = 0; i < this.zipContents.length; i++) {
                const item = this.zipContents[i];
                if (item.done == false) {
                    allDone = false;
                    break;
                }
            }

            if (allDone) {
                Mjztool.zipContents2(this.zipFileName, this.zipContents);
            }
        }
        if (this.checkCount <= 0 || allDone) {
            clearInterval(this.timer);
        }
    }
}

// public API:
// https://github.com/civitai/civitai/wiki/REST-API-Reference
class CivitAI {
    // zipContents: any[] = [];

    start(): void {
        if (Mjztool.matchURL('mjz_action=auto_download')) {
            this.download();
        }
        if (Mjztool.matchUrlList([
            'civitai.com/models/', 'civitai.com/gallery/']
        )) {
            this.AddUI();
        }


    }

    private AddUI() {

        //^ 一键下载
        // 添加一键下载相关控件
        let thisclass = this;
        const easy_download_id = 'mjz_easy_download';
        var $easy_download = $(`
            <div class="mjz_easy_download_wrap">
                <div id="${easy_download_id}"> 一键下载 !</div>
            </div>
            `);
        var $easy_download_style = $(`
        <style>
        .mjz_easy_download_wrap {
            display: flex;
            align-items: center;  justify-content: center;
            position: fixed;
            z-index: 999; bottom: 0; right: 0;
        }

        #${easy_download_id} {
            text-align: center; width: auto;
            padding: 4px;   margin: 4px 4px;
            text-align: center;
            font-size: 14px;  font-weight: 500;
            color: #228be6;  background-color: rgba(231, 245, 255, 1);
            border-radius: 4px;  cursor: pointer;  user-select: none;
            transition: 0.5s;   opacity: 0.1;
        }
        #${easy_download_id}:hover {   opacity: 1; }
        </style>
        `);

        $('body').append($easy_download);
        $('head').append($easy_download_style);

        //^ 下载事件绑定
        $(`#${easy_download_id}`).on({
            click: () => {
                thisclass.download();

                $(`#${easy_download_id}`).text(' 任务提交成功 !').css('backgroundColor', '#40c057');
            },
            mouseleave: () => {
                $(`#${easy_download_id}`).text(' 一键下载 !').css('backgroundColor', 'rgba(231, 245, 255, 1)');
            }
        });
    }

    download(): void {
        this.downloadAll(false);
    }

    downloadAll(all = true): void {
        if (Mjztool.matchURL('civitai.com/models/')) {
            this.downloadModels(all);
        }
        if (Mjztool.matchURL('civitai.com/gallery/')) {
            this.downloadGallery(all);
        }
    }


    downloadGallery(all = false): void {
        var url = window.location.href;
        var galleryId = url.match(/\d+/)[0];
        var img_url = '';
        var thisclass = this;
        $('img').each(function () {
            var src = $(this).attr('src');
            if (src.endsWith(galleryId)) {
                img_url = src;
                var imgFileName = `${galleryId}.png`;
                Mjztool.downloadImg(img_url, imgFileName);


                thisclass.saveGalleryImageMeta(galleryId, img_url);
            }
        });


    }

    public saveGalleryImageMeta(galleryId: string, img_url: string): void {
        let requestUrl = img_url;
        console.log('请求链接: ' + requestUrl);

        fetch(requestUrl)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                console.log(buffer.byteLength);
                var uint8View = new Uint8Array(buffer);
                console.log(uint8View[1]);

                // find text range
                var start = 0x34, end;
                var endBuffer = [0x00, 0x01, 0x00, 0x00, 0x49, 0x44, 0x41, 0x54];
                var endOffset = -4;
                for (let i = start; i < uint8View.length; i++) {
                    var isEnd = true;
                    for (let b = 0; b < endBuffer.length; b++) {
                        if (uint8View[i + b] != endBuffer[b]) {
                            isEnd = false;
                            break;
                        }
                    }

                    if (isEnd) {
                        end = i + endOffset;
                        break;
                    }
                }

                var textArray = uint8View.subarray(start, end);
                var text = new TextDecoder('utf-8').decode(textArray);
                console.info(text);

                Mjztool.saveText(text, galleryId, '.txt');
            });
    }

    downloadModels(all = false): void {
        console.info('CivitAI start download model metadata...')

        this.zipContents = [];

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

    public saveData(data: any): void {
        var zipFileName = data.id;
        var url = window.location.href;
        var modelId = url.match(/\d+/);
        var zipWrap = new ZipWrap(zipFileName);
        var versionCount = data.modelVersions.length;
        var modelVersionsMD = "";

        // save cover
        var coverItem = zipWrap.newBinaryItem();
        coverItem.path = data.id + '.png';

        // save all model metadata to json
        {
            var dataJSON = this.toJsonString(data);
            zipWrap.pushItem({
                path: modelId + ".json", content: dataJSON, done: true
            });
        }

        for (let i = 0; i < versionCount; i++) {
            const model = data.modelVersions[i];
            var modelFileName, modelName;

            // get model filename
            {
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
            }

            // save model metadata to markdown
            {
                var modelMD = this.modelToMD(model);
                zipWrap.pushItem({
                    path: modelName + "/" + modelFileName + ".md",
                    content: modelMD, done: true
                });
            }

            modelVersionsMD += '\n' + modelMD;

            // save model metadata to json
            {
                var modelJSON = this.toJsonString(model);
                zipWrap.pushItem({
                    path: modelName + "/" + modelFileName + ".json",
                    content: modelJSON, done: true
                });
            }

            // save model examples metadata to json
            {
                for (let p = 0; p < model.images.length; p++) {
                    const img = model.images[p];
                    var urlsp = img.url.split("/");
                    var imgName = urlsp[urlsp.length - 1];
                    zipWrap.pushItem({
                        path: modelName + "/examples/" + imgName + ".json",
                        content: this.toJsonString(img), done: true
                    });
                }
            }

            // save model cover
            {
                var itemForCover = zipWrap.newBinaryItem();
                itemForCover.path = modelName + '/' + modelName + '.png';
                itemForCover.id = 111111 + i;

                let cover_url = model.images[0]['url'];
                let requestUrl = cover_url;
                console.log('请求链接: ' + requestUrl);

                fetch(requestUrl)
                    .then(response => response.arrayBuffer())
                    .then(buffer => {
                        console.log(buffer.byteLength);
                        // var uint8View = new Uint8Array(buffer);
                        itemForCover.content = buffer;
                        itemForCover.done = true;

                        if (itemForCover.id == 111111) {
                            coverItem.content = itemForCover.content;
                            coverItem.done = true;
                        }
                    });
            }
        }

        // save all model metadata to markdown
        {
            zipWrap.pushItem({
                path: modelId + ".md",
                content: this.dataToMD(data, modelVersionsMD),
                done: true
            });
        }

        // save model link
        // url: https://civitai.com/models/14792/adventurers 👇
        // filename: adventurers.14792.models.civitai
        {
            var turl = url.split('?')[0];
            turl = turl.replace('https://', '').replace('.com', '');
            var filename = turl.split('/').reverse().join('.');
            zipWrap.pushItem({
                path: filename,
                content: url,
                done: true
            });
        }


        zipWrap.saveAsync();
    }

    private dataToMD(data: any, modelVersionsMD: string): string {
        var content = '';
        var homepage = `HomePage: https://civitai.com/models/${data.id}`;
        var rank = `❤${data.rank.favoriteCountAllTime}    `;
        rank += `${'⭐'.repeat(data.rank.ratingAllTime)}`;
        rank += `${data.rank.ratingCountAllTime}`;

        var creator = `Creator: <br>`;
        creator += `[${data.creator.username}](https://civitai.com/user/${data.creator.username}) <br>`;
        creator += `![creator](${data.creator.image})`;

        var tags = ``;
        for (let i = 0; i < data.tags.length; i++) {
            const tag = data.tags[i];
            tags += `[${tag}](https://civitai.com/tag/${tag})  `;
        }

        var cover = `![cover](${data.modelVersions[0].images[0].url})`;
        var lastUpdate = this.toLocaleTimeString(data.modelVersions[0].updatedAt);

        content = json2md([
            { h1: `${data.name}` },
            { p: homepage },
            {
                table: {
                    headers: [data.type, data.name.replace('|', '\\|')],
                    rows: [
                        [cover, `${rank}<br><br>${creator}`]
                    ]
                }
            },
            { h3: 'Info: ' },
            {
                table: {
                    headers: ["Attribute", "Value"],
                    rows: [
                        ["Type", data.type],
                        ["Downloads", data.rank.downloadCountAllTime],
                        ["Last Update", lastUpdate],
                        ["Versions", data.modelVersions.length],
                        ["Base Model", data.modelVersions[0].baseModel],
                        ["Tags", tags]
                    ]
                }
            },
            { h3: `Description: ` },
            { text: `${data.description}` },
            { h1: 'Model Versions: ' },
            { text: `${modelVersionsMD}` },
            { h1: 'END' }
        ]);

        return content;
    }

    private modelToMD(model: any) {
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
            var imgID = this.getImageId(image);
            var imgName = (j + 1) + ' - ' + imgID;

            // 获取大图片链接
            var img_big_url = this.getImageBigLink(image);

            var galleryLink = this.generateImageGalleryLink(model, image);

            var genData = '';
            if (image && image['meta']) {
                genData = this.generateImageData(image.meta);
            }

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

            examples += '\n### ==< ' + imgName + ' >==\n' +
                'Gallery link: \n' + galleryLink + '\n' +
                'Image(Small) link:  \n' + img_url + '\n' +
                'Image(Big) link:  \n' + img_big_url + '\n' +
                'Image(Big) : \n![](' + img_big_url + ')\n';
            if (msg) {
                examples += '#### Metadata: \n' + msg;
                examples += '\n#### Data: \n'
                    + '\n```\n' + `${genData}` + '\n```\n';
            } else {
                examples += '**Empty Metadata**\n';
            }
        }

        // 数据组合
        let modelFile = model.files[0];
        var cover = `![cover](${model.images[0].url})`;
        var lastUpdate = this.toLocaleTimeString(model.updatedAt);
        var fileSize = Mjztool.bytesToSize(modelFile.sizeKB * 1024);

        content = json2md([
            { h2: `Version: ${model.name}` },
            { text: cover },
        ]);

        content += json2md([
            { h3: 'Info: ' },
            {
                table: {
                    headers: ["Attribute", "Value"],
                    rows: [
                        ['Name', model.name || ''],
                        ['Last Update', lastUpdate],
                        ['Base Model', model.baseModel || ''],
                        ['Trained Words', model.trainedWords.join('  ')],
                        ['File Name', modelFile.name || ''],
                        ['File Format', modelFile.format || ''],
                        ['File Size', fileSize],
                        ['Download Url', modelFile.downloadUrl || ''],
                    ],
                }
            },
        ]);

        if (modelFile && modelFile['hashes']) {
            var hashes = modelFile['hashes'];
            var rows = [];
            for (const key in hashes) {
                if (Object.prototype.hasOwnProperty.call(hashes, key)) {
                    const value = hashes[key];
                    rows.push([key, value]);
                }
            }
            content += json2md([
                { h3: 'Hashes: ' },
                {
                    table: {
                        headers: ["Hash Function", "Hash Value"],
                        rows: rows
                    }
                },
            ]);
        }

        content += json2md([
            { h3: `About this version:` },
            { text: `${model.description || ''} ` },
        ]);

        content += json2md([
            { h2: `Example Images: ` },
            { text: examples.replace(/([\\<>])/g, '\\$1') }
        ]);

        return content;
    }

    private generateImageData(imgMeta: any): string {
        var result = '';
        var content = '';
        var prompt = '';
        var negativePrompt = '';
        var names = {
            seed: 'Seed',
            steps: 'Steps',
            sampler: 'Sampler',
            cfgScale: 'CFG scale',
        };

        for (const key in imgMeta) {
            if (Object.prototype.hasOwnProperty.call(imgMeta, key)) {
                const value = imgMeta[key];
                var keyLower = key.toLowerCase();
                if (keyLower == 'prompt') {
                    prompt = value;
                } else if (keyLower == 'negativePrompt'.toLowerCase()) {
                    negativePrompt = value;
                } else if (key == 'resources') {   // skip
                } else {
                    var name = names[key] || key;
                    content += `${name}: ${value}, `;
                }
            }
        }

        result += `${prompt}\n`;
        result += `Negative prompt: ${negativePrompt}\n`;
        result += `${content}\n`;

        return result;
    }

    private generateImageGalleryLink(model: any, image: any): string {
        let modelId = model.modelId;
        let modelVersionId = model.id;
        let imgId = this.getImageId(image);
        var link = `https://civitai.com/gallery/${imgId}`
            + `?modelId=${modelId}`
            + `&modelVersionId=${modelVersionId}&infinite=false`
            + `&returnUrl=%2Fmodels%2F${modelId}`;
        return link;
    }

    /**
     *  解析图片ID
     *  img_url:civitai.com/123456/width=450/203407
     * @param image 
     * @returns 203407
     */
    private getImageId(image: any): string {
        // 获取图片链接
        let img_url = image.url;
        var urlsp = img_url.split("/");
        var imgID = urlsp[urlsp.length - 1];
        return imgID;
    }

    /**
     *  获取大图片链接
     *  img_url:civitai.com/123456/width=450/203407
     * @param image 
     * @returns civitai.com/123456/width=1024/203407
     */
    private getImageBigLink(image: any): string {
        // *.civitai.com/*/width=450/203407
        // *.civitai.com/*/width=1024/203407
        // 获取图片链接
        let img_url = image.url;
        let imgId = this.getImageId(image);
        // 获取大图片链接
        var img_big_url = img_url;
        img_big_url = img_url.split("width=")[0];
        img_big_url += 'width=' + image.width + '/' + imgId;
        return img_big_url;
    }

    private toLocaleTimeString(timeISO: string): string {
        return new Date(timeISO).toLocaleString();
    }

    // private saveToZip(zipFileName: string) {
    //     if (this.zipContents.length > 0) {
    //         Mjztool.zipContents2(zipFileName, this.zipContents);
    //     }
    // }

    private toJsonString(obj: any) {
        return JSON.stringify(obj, null, 2);
    }
};

export default CivitAI