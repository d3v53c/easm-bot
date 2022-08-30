"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require("restify");
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`${server.name} listening to ${server.url}`);
});
