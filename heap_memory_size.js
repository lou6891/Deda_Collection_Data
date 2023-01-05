const v8 = require("v8")

//console.log(v8.getHeapStatistics())

const totalHeapsize = v8.getHeapStatistics().total_available_size
let totalHeapSizeinGb = (totalHeapsize /1024/1024/1024).toFixed(2)

console.log("total heap size (bytes) ", totalHeapsize, " in GB = ", totalHeapSizeinGb)

//node --max-old-space-size=2048

//2048 2GB
//4096 4GB
//