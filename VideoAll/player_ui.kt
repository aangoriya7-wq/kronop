// player_ui.kt - Android Native UI for Video Player
// Handles all UI buttons with instant response

package com.kronop.videoall

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.Toast
import androidx.core.animation.addListener
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class VideoPlayerUI @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    // UI Components
    private lateinit var videoSurface: SurfaceView
    private lateinit var overlayView: OverlayView
    private lateinit var controlsView: ControlsView
    
    // Button states
    private val buttonStates = mutableMapOf<String, Boolean>()
    
    // Gesture detection
    private lateinit var gestureDetector: GestureDetector
    private var isControlsVisible = true
    private val controlsHideHandler = Handler(Looper.getMainLooper())
    private val controlsHideRunnable = Runnable { hideControls() }
    
    // Progress tracking
    private var currentPosition = 0L
    private var duration = 0L
    private var bufferPercentage = 0
    
    // Quality settings
    private var currentQuality = "Auto"
    private val qualities = listOf("Auto", "240p", "360p", "480p", "720p", "1080p", "4K")
    
    init {
        initializeViews()
        setupGestures()
        setupButtons()
    }
    
    private fun initializeViews() {
        // Create video surface
        videoSurface = SurfaceView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }
        addView(videoSurface)
        
        // Create overlay for gestures
        overlayView = OverlayView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }
        addView(overlayView)
        
        // Create controls
        controlsView = ControlsView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }
        addView(controlsView)
    }
    
    private fun setupGestures() {
        gestureDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                toggleControls()
                return true
            }
            
            override fun onDoubleTap(e: MotionEvent): Boolean {
                handleDoubleTap(e)
                return true
            }
            
            override fun onScroll(
                e1: MotionEvent?,
                e2: MotionEvent,
                distanceX: Float,
                distanceY: Float
            ): Boolean {
                handleScroll(e1, e2, distanceX, distanceY)
                return true
            }
            
            override fun onFling(
                e1: MotionEvent?,
                e2: MotionEvent,
                velocityX: Float,
                velocityY: Float
            ): Boolean {
                handleFling(velocityX, velocityY)
                return true
            }
        })
    }
    
    private fun setupButtons() {
        // Initialize all button states
        buttonStates["star"] = false
        buttonStates["comment"] = false
        buttonStates["share"] = false
        buttonStates["save"] = false
        buttonStates["report"] = false
        buttonStates["support"] = false
        buttonStates["play"] = true
        buttonStates["mute"] = false
        buttonStates["fullscreen"] = false
        
        // Setup button click listeners
        setupButtonListeners()
    }
    
    private fun setupButtonListeners() {
        // Star button
        controlsView.findViewById<View>(R.id.btn_star)?.setOnClickListener {
            toggleStar()
        }
        
        // Comment button
        controlsView.findViewById<View>(R.id.btn_comment)?.setOnClickListener {
            showComments()
        }
        
        // Share button
        controlsView.findViewById<View>(R.id.btn_share)?.setOnClickListener {
            shareVideo()
        }
        
        // Save button
        controlsView.findViewById<View>(R.id.btn_save)?.setOnClickListener {
            saveVideo()
        }
        
        // Report button
        controlsView.findViewById<View>(R.id.btn_report)?.setOnClickListener {
            reportVideo()
        }
        
        // Support button
        controlsView.findViewById<View>(R.id.btn_support)?.setOnClickListener {
            openSupport()
        }
        
        // Play/Pause button
        controlsView.findViewById<View>(R.id.btn_play_pause)?.setOnClickListener {
            togglePlayPause()
        }
        
        // Quality button
        controlsView.findViewById<View>(R.id.btn_quality)?.setOnClickListener {
            showQualityMenu()
        }
        
        // Fullscreen button
        controlsView.findViewById<View>(R.id.btn_fullscreen)?.setOnClickListener {
            toggleFullscreen()
        }
    }
    
    private fun toggleStar() {
        buttonStates["star"] = !(buttonStates["star"] ?: false)
        val button = controlsView.findViewById<View>(R.id.btn_star)
        
        // Animate button
        button?.animate()?.apply {
            scaleX(1.2f)
            scaleY(1.2f)
            duration = 100
            withEndAction {
                button.scaleX = if (buttonStates["star"] == true) 1.2f else 1.0f
                button.scaleY = if (buttonStates["star"] == true) 1.2f else 1.0f
                
                // Change color
                if (buttonStates["star"] == true) {
                    button.setColorFilter(Color.YELLOW)
                    Toast.makeText(context, "Added to favorites", Toast.LENGTH_SHORT).show()
                } else {
                    button.setColorFilter(Color.WHITE)
                }
            }
        }.start()
        
        // Notify native side
        notifyButtonClick("star")
    }
    
    private fun showComments() {
        // Animate comments section
        val commentsView = controlsView.findViewById<View>(R.id.comments_section)
        commentsView?.visibility = View.VISIBLE
        commentsView?.animate()?.apply {
            translationY(0f)
            alpha(1f)
            duration = 300
        }.start()
        
        notifyButtonClick("comment")
    }
    
    private fun shareVideo() {
        // Create share intent
        val shareIntent = android.content.Intent().apply {
            action = android.content.Intent.ACTION_SEND
            putExtra(android.content.Intent.EXTRA_TEXT, "Check out this video!")
            type = "text/plain"
        }
        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Video"))
        
        notifyButtonClick("share")
    }
    
    private fun saveVideo() {
        buttonStates["save"] = true
        
        // Animate save button
        val button = controlsView.findViewById<View>(R.id.btn_save)
        button?.animate()?.apply {
            rotation(360f)
            duration = 500
            withEndAction {
                button.rotation = 0f
                button.setColorFilter(Color.GREEN)
                Toast.makeText(context, "Saved to watch later", Toast.LENGTH_SHORT).show()
            }
        }.start()
        
        notifyButtonClick("save")
    }
    
    private fun reportVideo() {
        // Show report dialog
        android.app.AlertDialog.Builder(context).apply {
            setTitle("Report Video")
            setMessage("Why are you reporting this video?")
            setItems(arrayOf("Inappropriate content", "Spam", "Harassment", "Other")) { _, which ->
                Toast.makeText(context, "Thank you for your report", Toast.LENGTH_SHORT).show()
                notifyButtonClick("report")
            }
            setNegativeButton("Cancel", null)
            show()
        }
    }
    
    private fun openSupport() {
        // Open support chat
        Toast.makeText(context, "Opening support chat", Toast.LENGTH_SHORT).show()
        notifyButtonClick("support")
    }
    
    private fun togglePlayPause() {
        buttonStates["play"] = !(buttonStates["play"] ?: true)
        
        val button = controlsView.findViewById<View>(R.id.btn_play_pause)
        val iconRes = if (buttonStates["play"] == true) 
            R.drawable.ic_pause else R.drawable.ic_play
        
        button?.setBackgroundResource(iconRes)
        
        // Animate
        button?.animate()?.apply {
            scaleX(0.8f)
            scaleY(0.8f)
            duration = 100
            withEndAction {
                button.scaleX = 1.0f
                button.scaleY = 1.0f
            }
        }.start()
        
        notifyButtonClick(if (buttonStates["play"] == true) "play" else "pause")
    }
    
    private fun showQualityMenu() {
        val qualityItems = qualities.toTypedArray()
        
        android.app.AlertDialog.Builder(context).apply {
            setTitle("Select Quality")
            setItems(qualityItems) { _, which ->
                currentQuality = qualityItems[which]
                Toast.makeText(context, "Quality: $currentQuality", Toast.LENGTH_SHORT).show()
                notifyQualityChange(currentQuality)
            }
            show()
        }
    }
    
    private fun toggleFullscreen() {
        buttonStates["fullscreen"] = !(buttonStates["fullscreen"] ?: false)
        notifyButtonClick("fullscreen")
    }
    
    private fun toggleControls() {
        if (isControlsVisible) {
            hideControls()
        } else {
            showControls()
        }
    }
    
    private fun showControls() {
        isControlsVisible = true
        controlsView.animate().alpha(1f).duration = 200
        controlsHideHandler.removeCallbacks(controlsHideRunnable)
        controlsHideHandler.postDelayed(controlsHideRunnable, 3000)
    }
    
    private fun hideControls() {
        isControlsVisible = false
        controlsView.animate().alpha(0f).duration = 200
    }
    
    private fun handleDoubleTap(e: MotionEvent) {
        val x = e.x
        val screenWidth = width
        
        if (x < screenWidth / 3) {
            // Left side - seek backward
            performSeek(-10)
            showSeekIndicator(-10)
        } else if (x > 2 * screenWidth / 3) {
            // Right side - seek forward
            performSeek(10)
            showSeekIndicator(10)
        } else {
            // Center - play/pause
            togglePlayPause()
        }
    }
    
    private fun handleScroll(e1: MotionEvent?, e2: MotionEvent, distanceX: Float, distanceY: Float) {
        val screenWidth = width
        val screenHeight = height
        
        if (abs(distanceX) > abs(distanceY)) {
            // Horizontal scroll - seek
            val seekAmount = (distanceX / screenWidth) * duration / 2
            performSeek((-seekAmount).toInt())
        } else {
            // Vertical scroll - adjust volume/brightness
            if (e1?.x ?: 0f < screenWidth / 2) {
                // Left side - brightness
                adjustBrightness(-distanceY / screenHeight)
            } else {
                // Right side - volume
                adjustVolume(-distanceY / screenHeight)
            }
        }
    }
    
    private fun handleFling(velocityX: Float, velocityY: Float) {
        if (abs(velocityX) > abs(velocityY) && abs(velocityX) > 5000) {
            // Fast seek
            val seekAmount = if (velocityX > 0) -30 else 30
            performSeek(seekAmount)
            showSeekIndicator(seekAmount)
        }
    }
    
    private fun performSeek(seconds: Int) {
        val newPosition = max(0, min(duration, currentPosition + seconds * 1000))
        currentPosition = newPosition
        
        // Notify native player
        notifySeek(newPosition)
        
        // Update UI
        controlsView.updateProgress(newPosition, duration)
    }
    
    private fun showSeekIndicator(seconds: Int) {
        overlayView.showSeekIndicator(seconds)
    }
    
    private fun adjustBrightness(delta: Float) {
        val layoutParams = videoSurface.layoutParams as LayoutParams
        // Adjust brightness
        overlayView.showBrightnessIndicator(delta)
    }
    
    private fun adjustVolume(delta: Float) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        
        val newVolume = (currentVolume + delta * maxVolume).toInt()
            .coerceIn(0, maxVolume)
        
        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, newVolume, 0)
        overlayView.showVolumeIndicator(newVolume.toFloat() / maxVolume)
    }
    
    fun updateProgress(position: Long, buffered: Int) {
        currentPosition = position
        bufferPercentage = buffered
        
        controlsView.updateProgress(position, duration)
        controlsView.updateBufferProgress(buffered)
    }
    
    fun setDuration(duration: Long) {
        this.duration = duration
        controlsView.setDuration(duration)
    }
    
    fun setTitle(title: String) {
        controlsView.setTitle(title)
    }
    
    fun setChannelInfo(channelName: String, channelIcon: Bitmap?) {
        controlsView.setChannelInfo(channelName, channelIcon)
    }
    
    private fun notifyButtonClick(buttonId: String) {
        // Call native C++ through JNI
        nativeButtonClick(buttonId)
    }
    
    private fun notifySeek(position: Long) {
        // Call native C++ through JNI
        nativeSeek(position)
    }
    
    private fun notifyQualityChange(quality: String) {
        // Call native C++ through JNI
        nativeQualityChange(quality)
    }
    
    // Native methods
    private external fun nativeButtonClick(buttonId: String)
    private external fun nativeSeek(position: Long)
    private external fun nativeQualityChange(quality: String)
    
    override fun onTouchEvent(event: MotionEvent): Boolean {
        return gestureDetector.onTouchEvent(event) || super.onTouchEvent(event)
    }
    
    // Custom view for overlay animations
    inner class OverlayView(context: Context) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = 48f
            textAlign = Paint.Align.CENTER
        }
        
        private var seekText = ""
        private var brightnessLevel = -1f
        private var volumeLevel = -1f
        
        fun showSeekIndicator(seconds: Int) {
            seekText = if (seconds > 0) "+$seconds s" else "$seconds s"
            invalidate()
            
            Handler(Looper.getMainLooper()).postDelayed({
                seekText = ""
                invalidate()
            }, 1000)
        }
        
        fun showBrightnessIndicator(level: Float) {
            brightnessLevel = level.coerceIn(0f, 1f)
            invalidate()
            
            Handler(Looper.getMainLooper()).postDelayed({
                brightnessLevel = -1f
                invalidate()
            }, 1000)
        }
        
        fun showVolumeIndicator(level: Float) {
            volumeLevel = level
            invalidate()
            
            Handler(Looper.getMainLooper()).postDelayed({
                volumeLevel = -1f
                invalidate()
            }, 1000)
        }
        
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            
            // Draw seek indicator
            if (seekText.isNotEmpty()) {
                canvas.drawText(seekText, width / 2f, height / 2f, textPaint)
            }
            
            // Draw brightness indicator
            if (brightnessLevel >= 0) {
                paint.color = Color.argb(100, 255, 255, 255)
                canvas.drawRect(
                    width - 100f,
                    height * (1 - brightnessLevel),
                    width - 50f,
                    height.toFloat(),
                    paint
                )
            }
            
            // Draw volume indicator
            if (volumeLevel >= 0) {
                paint.color = Color.argb(100, 255, 255, 255)
                canvas.drawRect(
                    50f,
                    height * (1 - volumeLevel),
                    100f,
                    height.toFloat(),
                    paint
                )
            }
        }
    }
    
    // Custom view for controls
    inner class ControlsView(context: Context) : View(context) {
        // UI Elements will be inflated from XML
        // This is a simplified version
        
        fun updateProgress(position: Long, duration: Long) {
            // Update progress bar
        }
        
        fun updateBufferProgress(percentage: Int) {
            // Update buffer indicator
        }
        
        fun setDuration(duration: Long) {
            // Set duration display
        }
        
        fun setTitle(title: String) {
            // Set video title
        }
        
        fun setChannelInfo(name: String, icon: Bitmap?) {
            // Set channel info
        }
    }
}
