import dns from "node:dns/promises";

try {
    const result = await dns.resolveSrv(
        "_mongodb._tcp.startup-crm-lite.nsyuite.mongodb.net"
    );
    console.log(result);
} catch (err) {
    console.error(err);
}