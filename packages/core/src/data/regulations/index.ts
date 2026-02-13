
import { Regulation } from "./types";
import { gdpr } from "./gdpr";
import { hipaa } from "./hipaa";
import { nis2 } from "./nis2";
import { dora } from "./dora";
import { euAiAct } from "./eu_ai_act";
import { cmmc } from "./cmmc";
import { ccpa } from "./ccpa";
import { iso27701 } from "./iso27701";
import { iso29100 } from "./iso29100";
import { coppa } from "./coppa";
import { glba } from "./glba";
import { vcdpa } from "./vcdpa";
import { cpa } from "./cpa";
import { ctdpa } from "./ctdpa";
import { ucpa } from "./ucpa";
import { pipeda } from "./pipeda";
import { lgpd } from "./lgpd";
import { ukGdpr } from "./uk_gdpr";
import { appi } from "./appi";
import { australiaPrivacy } from "./australia_privacy";
import { technicalPrivacy } from "./technical_privacy";

export const regulations: Regulation[] = [
    gdpr,
    ukGdpr,
    ccpa,
    vcdpa,
    cpa,
    ctdpa,
    ucpa,
    hipaa,
    coppa,
    glba,
    iso27701,
    iso29100,
    pipeda,
    lgpd,
    appi,
    australiaPrivacy,
    technicalPrivacy,
    nis2,
    dora,
    euAiAct,
    cmmc
];

export const getRegulation = (id: string): Regulation | undefined => {
    return regulations.find(r => r.id === id);
};
