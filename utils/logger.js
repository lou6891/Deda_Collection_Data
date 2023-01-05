//https://medium.com/geekculture/nodejs-console-logs-in-docker-containers-hidden-no-more-d04bcfe1dc5c
const log4js = require("log4js")
const fs = require("fs")

log4js.configure({
    appenders: {
        "stdout" : { type: "stdout" },
        "file"   : { type: "fileSync", filename: "logs/out.log" , flags : "w", maxLogSize: "1M", backups : "1"},
    },
    categories: {
        default:  { appenders: [ 'stdout', 'file'], level: 'info' }
    }

});

exports.logger = log4js.getLogger();

exports.readLog = () => {
    let log = fs.readFileSync('logs/out.log','utf8',
        (error, content) => {
            if(error) {
                log4js.getLogger().error(error);
                return error;
            }
            //otherwise
            return content;
        });
    return log;
}