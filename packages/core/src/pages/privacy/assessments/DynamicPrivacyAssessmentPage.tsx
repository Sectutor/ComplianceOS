
import React from "react";
import { useParams } from "wouter";
import PrivacyAssessment from "../PrivacyAssessment";
import { privacyChecklists } from "@/data/regulations/checklists";
import { getRegulation } from "@/data/regulations";

export default function DynamicPrivacyAssessmentPage() {
    const { type } = useParams<{ type: string }>();

    // Normalize type (e.g. "iso-27701" -> "iso27701")
    const checklistKey = type?.replace(/-/g, '');
    const checklist = privacyChecklists[checklistKey || ""] || [];
    const regulation = getRegulation(type || "");

    if (!checklist || checklist.length === 0) {
        return <div className="p-8">Checklist for {type} not found.</div>;
    }

    return (
        <PrivacyAssessment
            title={`${regulation?.name || type?.toUpperCase()} Compliance Checklist`}
            type={type || "unknown"}
            checklist={checklist}
            mode="checklist"
        />
    );
}
