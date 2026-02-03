package com.example.inspection

import android.net.Uri

/**
 * Represents a single question in an inspection.
 */
data class Question(
    val id: String,
    val text: String,
    val sectionName: String
)

/**
 * Data class to store the user's answer for a specific question.
 */
data class InspectionAnswer(
    val inspectionId: String,
    val sectionName: String,
    val questionId: String,
    var answer: String? = null, // "YES", "NO", "NA"
    var selectedReasons: List<String> = emptyList(),
    var remarks: String? = null,
    var imageUris: List<String> = emptyList(),
    val timestamp: Long = System.currentTimeMillis()
)
