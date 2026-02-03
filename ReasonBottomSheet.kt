package com.example.inspection

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.MediaStore
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * BottomSheet to handle the "NO" answer flow: selecting reasons, adding remarks, and picking images.
 */
class ReasonBottomSheet : BottomSheetDialogFragment() {

    private lateinit var reasonContainer: LinearLayout
    private lateinit var etRemarks: EditText
    private var imageUris = mutableListOf<String>()
    
    // Callback to pass data back to activity
    var onDone: ((reasons: List<String>, remarks: String, images: List<String>) -> Unit)? = null
    var onCancel: (() -> Unit)? = null

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                imageUris.add(uri.toString())
                Toast.makeText(requireContext(), "Image added", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.bottom_sheet_reasons, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        reasonContainer = view.findViewById(R.id.reasonContainer)
        etRemarks = view.findViewById(R.id.etRemarks)
        val btnAddImage: Button = view.findViewById(R.id.btnAddImage)
        val btnDone: Button = view.findViewById(R.id.btnDone)
        val btnCancel: Button = view.findViewById(R.id.btnCancel)

        // Mock predefined reasons
        val reasons = listOf("Damaged", "Dirty", "Broken", "Missing")
        reasons.forEach { reason ->
            val cb = CheckBox(requireContext())
            cb.text = reason
            reasonContainer.addView(cb)
        }

        btnAddImage.setOnClickListener {
            val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            pickImageLauncher.launch(intent)
        }

        btnDone.setOnClickListener {
            val selectedReasons = mutableListOf<String>()
            for (i in 0 until reasonContainer.childCount) {
                val view = reasonContainer.getChildAt(i)
                if (view is CheckBox && view.isChecked) {
                    selectedReasons.add(view.text.toString())
                }
            }

            if (selectedReasons.isEmpty()) {
                Toast.makeText(requireContext(), "Please select at least one reason", Toast.LENGTH_SHORT).show()
            } else {
                onDone?.invoke(selectedReasons, etRemarks.text.toString(), imageUris)
                dismiss()
            }
        }

        btnCancel.setOnClickListener {
            onCancel?.invoke()
            dismiss()
        }
    }
}
