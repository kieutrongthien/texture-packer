const fs = require('fs');
const chokidar = require('chokidar');
const { dialog } = require('@electron/remote');

import Controller from 'platform/Controller';
import I18 from '../../utils/I18';
import Base64ImagesLoader from '../../utils/Base64ImagesLoader';
import { Observer, GLOBAL_EVENT } from '../../Observer';

const IMAGES_EXT = ['jpg', 'png', 'gif'];

let watcher = null;

class FileSystem {
    static fixPath(path) {
        return path.split("\\").join("/");
    }

    static getExtFromPath(path) {
        return path.split(".").pop().toLowerCase();
    }

    static selectFolder() {
        let dir = dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        return dir;
    }

    static getFolderFilesList(dir, base = "", list = []) {
        let files = fs.readdirSync(dir);
        for (let file of files) {
            if (fs.statSync(dir + file).isDirectory() && (dir + file).toUpperCase().indexOf("__MACOSX") < 0) {
                list = FileSystem.getFolderFilesList(dir + file + '/', base + file + "/", list);
            }
            else {
                list.push({
                    name: (base ? base : "") + file,
                    path: dir + file
                });
            }
        }

        return list;
    }

    static addImages(cb) {
        let list = dialog.showOpenDialog({
            filters: [{ name: I18.f("IMAGES"), extensions: IMAGES_EXT }],
            properties: ['openFile', 'multiSelections']
        });

        list.then(function (result) {
            if (result && result.filePaths) {
                let files = [];
                for (let path of list) {
                    path = FileSystem.fixPath(path);
                    let name = path.split("/").pop();

                    files.push({
                        name: name,
                        path: path,
                        folder: ""
                    });
                }

                FileSystem.loadImages(files, cb);                    
            } else {
                if (cb) cb();
            }
        });
    }

    static addFolder(cb) {
        let dir = dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        dir.then(function (result) {
            if (result && result.filePaths.length) {
                let path = FileSystem.fixPath(result.filePaths[0]);
                FileSystem.loadFolder(path, cb);                
            } else {
                if(cb) cb();
            }
        });
    }

    static startWatch(path) {
        try {
            if (!watcher) {
                watcher = chokidar.watch(path, { ignoreInitial: true });
                watcher.on('all', FileSystem.onWatchEvent);
            }
            else {
                watcher.add(path);
            }
        }
        catch (e) { }
    }

    static stopWatch(path) {
        if (watcher) {
            watcher.unwatch(path);
        }
    }

    static terminateWatch() {
        if (watcher) {
            watcher.close();
            watcher = null;
        }
    }

    static onWatchEvent(event, path) {
        Observer.emit(GLOBAL_EVENT.FS_CHANGES, { event: event, path: FileSystem.fixPath(path) });
    }

    static loadImages(list, cb) {
        let files = [];

        for (let item of list) {
            let path = item.path;
            let ext = FileSystem.getExtFromPath(path);

            if (IMAGES_EXT.indexOf(ext) >= 0) {
                if (!item.folder) FileSystem.startWatch(path);

                try {
                    let content = fs.readFileSync(path, 'base64');
                    content = "data:image/" + ext + ";base64," + content;
                    files.push({ name: item.name, url: content, fsPath: item });
                }
                catch (e) { }
            }
        }

        let loader = new Base64ImagesLoader();
        loader.load(files, null, (res) => {
            if (cb) cb(res);
        });
    }

    static loadFolder(path, cb) {
        if (fs.existsSync(path)) {
            FileSystem.startWatch(path);

            let parts = path.split("/");
            let name = "";
            while (parts.length && !name) name = parts.pop();

            let list = FileSystem.getFolderFilesList(path + "/", name + "/");

            for (let item of list) {
                item.folder = path;
            }

            FileSystem.loadImages(list, cb);
        }
        else {
            cb({});
        }
    }

    static saveProject(data, path = "", cb = null) {
        let options = {
            filters: [{ name: "Texture packer", extensions: ['tpp'] }]
        };

        const handle = (p) => {
            const savePath = FileSystem.fixPath(p);

            try {
                fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
                Controller.updateProject(savePath);
            }
            catch (e) {

            }
        };

        if (!path) {
            dialog.showSaveDialog(options)
            .then((result) => {
                if (result && result.filePath) {
                    handle(result.filePath);
                    if (cb) cb(result.filePath);
                }
            });
            return "";
        }

        handle(path);
        return "";
    }

    static async loadProject(pathToLoad = "") {
        let path;

        if (pathToLoad) {
            path = FileSystem.fixPath(pathToLoad);
        }
        else {
            path = await dialog.showOpenDialog({
                filters: [{ name: "Texture packer", extensions: ['tpp'] }],
                properties: ['openFile']
            });
            
            if (path && path.filePaths.length) {
                path = FileSystem.fixPath(path.filePaths[0]);
            }
        }

        let data = null;

        if (path) {
            try {
                data = fs.readFileSync(path);
                data = JSON.parse(data);
                Controller.updateProject(path);
            }
            catch (e) { data = null }
        }

        return { path, data };
    }
}

export default FileSystem;