const fs = require('fs');
const path = require('path');

const {dialog} = require('@electron/remote')

import I18 from '../../utils/I18';

class Downloader {
    static run(files, fileName, savePath) {
        let dir = savePath;
        const handle = (saveAt) => {
            for(let file of files) {
                let content = file.content;
                if(file.base64) content = Buffer.from(content, 'base64');

                let savePath = path.normalize(saveAt + "/" + file.name);
                savePath = savePath.split("\\").join("/");

                let saveDirParts = savePath.split("/");
                saveDirParts.pop();
                let currentPath = '';
                while(saveDirParts.length) {
                    currentPath = currentPath + saveDirParts.shift() + '/';
                    if(!fs.existsSync(currentPath)) {
                        fs.mkdirSync(currentPath);
                    }
                }

                fs.writeFileSync(savePath, content);
            }
        };

        const handleExists = (saveAt) => {
            let exists = false;
            for(let file of files) {
                if(fs.existsSync(path.normalize(saveAt + "/" + file.name))) {
                    exists = true;
                    break;
                }
            }
            
            if(exists) {
                dialog.showMessageBox({buttons: ["Yes","No","Cancel"], message: I18.f('REPLACE_FILES_PROMPT')}, (res) => {
                    if(res === 0) handle(saveAt);
                });
            }
            else {
                handle(saveAt);
            }

            dialog.showMessageBox({ message: `Exported ${files.length} file.` });
        };
        
        if(!dir) {
            dialog.showOpenDialog({
                properties: ['openDirectory']
            })
            .then((result) => {
                if (result.filePaths.length > 0) {
                    handleExists(result.filePaths[0]);
                }
            })
        } else {
            handleExists(dir);
        }
    }
}

export default Downloader;