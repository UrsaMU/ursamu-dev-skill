import { DBO } from "jsr:@ursamu/ursamu";

interface IRecord { id: string; text: string; }

// VIOLATION: collection name "records" has no plugin namespace prefix
const records = new DBO<IRecord>("records");
