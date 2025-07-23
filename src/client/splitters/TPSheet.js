import Splitter from './Splitter';

class TPSheet extends Splitter {
    static check(data, cb) {
        const lines = data.split(/\r?\n/);
        const hasValidLine = lines.some(line => {
            return line.includes(';') && line.split(';').length >= 12 && !line.trim().startsWith(':');
        });
        cb(hasValidLine);
    }

    static split(data, options, cb) {
        if (!data) {
            cb([]);
            return;
        }

        const imgData = [];
        const sourceSize = { w: 0, h: 0 }; 
        const res = [];
        const lines = data.split(/\r?\n/);

        for (let line of lines) {
            line = line.trim();

            if (line.startsWith(":size=")) {
                const size = line.substring(6).split("x");
                sourceSize.w = parseInt(size[0]);
                sourceSize.h = parseInt(size[1]);
                continue;
            }

            if (line === '' || line.startsWith(':')) continue;

            const parts = line.split(';');
            if (parts.length < 11) continue;
            imgData.push(parts);
        }

        for (let img of imgData) {
            const name = img[0].split('/').pop();
            const x = parseInt(img[1]);
            const y = parseInt(img[2]);
            const w = parseInt(img[3]);
            const h = parseInt(img[4]);
            const y_from_top = sourceSize.h - y - h;

            const anchorX = parseFloat(img[5]);
            const anchorY = parseFloat(img[6]);

            const offsetX = parseInt(img[7]);
            const offsetY = parseInt(img[8]);

            res.push({
                name: Splitter.fixFileName(name),
                frame: { x, y: y_from_top, w, h },
                spriteSourceSize: { x: 0, y: 0, w, h },
                sourceSize: { w, h },
                trimmed: false,
                rotated: false,
                anchor: { x: anchorX, y: anchorY }
            });            
        }

        cb(res);
    }

    static get type() {
        return 'TPSheet';
    }
}

export default TPSheet;