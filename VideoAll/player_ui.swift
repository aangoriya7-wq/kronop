// player_ui.swift - iOS Native UI for Video Player
// Handles all UI buttons with instant response

import UIKit
import AVFoundation
import MediaPlayer

class VideoPlayerUI: UIView {
    
    // MARK: - UI Components
    private let videoContainerView = UIView()
    private let controlsOverlay = UIView()
    private let topBar = UIStackView()
    private let bottomBar = UIStackView()
    private let rightBar = UIStackView()
    
    // Video surface
    private var playerLayer: AVPlayerLayer?
    private var player: AVPlayer?
    
    // Buttons
    private let starButton = UIButton()
    private let commentButton = UIButton()
    private let shareButton = UIButton()
    private let saveButton = UIButton()
    private let reportButton = UIButton()
    private let supportButton = UIButton()
    private let playPauseButton = UIButton()
    private let qualityButton = UIButton()
    private let fullscreenButton = UIButton()
    
    // Labels
    private let titleLabel = UILabel()
    private let channelLabel = UILabel()
    private let currentTimeLabel = UILabel()
    private let durationLabel = UILabel()
    
    // Progress
    private let progressSlider = UISlider()
    private let bufferProgressView = UIProgressView()
    
    // Gestures
    private var tapGesture: UITapGestureRecognizer?
    private var doubleTapGesture: UITapGestureRecognizer?
    private var panGesture: UIPanGestureRecognizer?
    private var pinchGesture: UIPinchGestureRecognizer?
    
    // State
    private var isControlsVisible = true
    private var isPlaying = false
    private var isFullscreen = false
    private var currentQuality = "Auto"
    private let qualities = ["Auto", "240p", "360p", "480p", "720p", "1080p", "4K"]
    
    // Progress tracking
    private var currentPosition: CMTime = .zero
    private var duration: CMTime = .zero
    private var bufferPosition: CMTime = .zero
    
    // Animation
    private let controlsHideTimer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()
    private var hideTimerSubscription: Any?
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
        setupGestures()
        setupNotifications()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
        setupGestures()
        setupNotifications()
    }
    
    private func setupView() {
        backgroundColor = .black
        
        // Setup video container
        videoContainerView.frame = bounds
        videoContainerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(videoContainerView)
        
        // Setup controls overlay
        controlsOverlay.frame = bounds
        controlsOverlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        controlsOverlay.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        addSubview(controlsOverlay)
        
        setupTopBar()
        setupBottomBar()
        setupRightBar()
        setupLabels()
        setupProgress()
        
        // Initial hide timer
        startHideTimer()
    }
    
    private func setupTopBar() {
        topBar.axis = .horizontal
        topBar.distribution = .fill
        topBar.alignment = .center
        topBar.spacing = 16
        topBar.translatesAutoresizingMaskIntoConstraints = false
        
        // Channel info
        let channelIcon = UIImageView(image: UIImage(systemName: "person.circle.fill"))
        channelIcon.tintColor = .white
        channelIcon.contentMode = .scaleAspectFill
        channelIcon.widthAnchor.constraint(equalToConstant: 40).isActive = true
        channelIcon.heightAnchor.constraint(equalToConstant: 40).isActive = true
        
        let channelStack = UIStackView(arrangedSubviews: [channelIcon, channelLabel])
        channelStack.axis = .horizontal
        channelStack.spacing = 8
        channelStack.alignment = .center
        
        topBar.addArrangedSubview(channelStack)
        topBar.addArrangedSubview(UIView()) // Spacer
        
        // Report and support buttons
        setupButton(reportButton, icon: "exclamationmark.triangle", action: #selector(reportTapped))
        setupButton(supportButton, icon: "questionmark.circle", action: #selector(supportTapped))
        
        topBar.addArrangedSubview(reportButton)
        topBar.addArrangedSubview(supportButton)
        
        controlsOverlay.addSubview(topBar)
        
        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 16),
            topBar.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            topBar.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            topBar.heightAnchor.constraint(equalToConstant: 50)
        ])
    }
    
    private func setupBottomBar() {
        bottomBar.axis = .horizontal
        bottomBar.distribution = .fill
        bottomBar.alignment = .center
        bottomBar.spacing = 24
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        
        // Play/Pause button
        setupButton(playPauseButton, icon: "pause.fill", action: #selector(playPauseTapped))
        playPauseButton.widthAnchor.constraint(equalToConstant: 44).isActive = true
        playPauseButton.heightAnchor.constraint(equalToConstant: 44).isActive = true
        
        // Time labels
        currentTimeLabel.text = "00:00"
        currentTimeLabel.textColor = .white
        currentTimeLabel.font = .monospacedDigitSystemFont(ofSize: 14, weight: .regular)
        
        durationLabel.text = "00:00"
        durationLabel.textColor = .white
        durationLabel.font = .monospacedDigitSystemFont(ofSize: 14, weight: .regular)
        
        let timeStack = UIStackView(arrangedSubviews: [currentTimeLabel, durationLabel])
        timeStack.axis = .horizontal
        timeStack.spacing = 4
        timeStack.distribution = .fill
        
        // Progress slider
        progressSlider.setThumbImage(UIImage(systemName: "circle.fill"), for: .normal)
        progressSlider.tintColor = .red
        progressSlider.addTarget(self, action: #selector(progressChanged), for: .valueChanged)
        progressSlider.addTarget(self, action: #selector(progressTouchEnded), for: [.touchUpInside, .touchUpOutside])
        
        bottomBar.addArrangedSubview(playPauseButton)
        bottomBar.addArrangedSubview(currentTimeLabel)
        bottomBar.addArrangedSubview(progressSlider)
        bottomBar.addArrangedSubview(durationLabel)
        bottomBar.addArrangedSubview(qualityButton)
        bottomBar.addArrangedSubview(fullscreenButton)
        
        controlsOverlay.addSubview(bottomBar)
        
        NSLayoutConstraint.activate([
            bottomBar.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -16),
            bottomBar.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            bottomBar.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            bottomBar.heightAnchor.constraint(equalToConstant: 50)
        ])
        
        // Buffer progress view (behind slider)
        bufferProgressView.progressTintColor = .lightGray
        bufferProgressView.trackTintColor = .darkGray
        bufferProgressView.translatesAutoresizingMaskIntoConstraints = false
        controlsOverlay.insertSubview(bufferProgressView, belowSubview: bottomBar)
        
        NSLayoutConstraint.activate([
            bufferProgressView.centerYAnchor.constraint(equalTo: progressSlider.centerYAnchor),
            bufferProgressView.leadingAnchor.constraint(equalTo: progressSlider.leadingAnchor),
            bufferProgressView.trailingAnchor.constraint(equalTo: progressSlider.trailingAnchor),
            bufferProgressView.heightAnchor.constraint(equalToConstant: 2)
        ])
    }
    
    private func setupRightBar() {
        rightBar.axis = .vertical
        rightBar.distribution = .fillEqually
        rightBar.alignment = .center
        rightBar.spacing = 24
        rightBar.translatesAutoresizingMaskIntoConstraints = false
        
        // Action buttons
        setupButton(starButton, icon: "star", action: #selector(starTapped))
        setupButton(commentButton, icon: "message", action: #selector(commentTapped))
        setupButton(shareButton, icon: "square.and.arrow.up", action: #selector(shareTapped))
        setupButton(saveButton, icon: "bookmark", action: #selector(saveTapped))
        
        rightBar.addArrangedSubview(starButton)
        rightBar.addArrangedSubview(commentButton)
        rightBar.addArrangedSubview(shareButton)
        rightBar.addArrangedSubview(saveButton)
        
        controlsOverlay.addSubview(rightBar)
        
        NSLayoutConstraint.activate([
            rightBar.centerYAnchor.constraint(equalTo: centerYAnchor),
            rightBar.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            rightBar.widthAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    private func setupButton(_ button: UIButton, icon: String, action: Selector) {
        let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .regular)
        button.setImage(UIImage(systemName: icon, withConfiguration: config), for: .normal)
        button.tintColor = .white
        button.addTarget(self, action: action, for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
    }
    
    private func setupLabels() {
        titleLabel.textColor = .white
        titleLabel.font = .boldSystemFont(ofSize: 18)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        controlsOverlay.addSubview(titleLabel)
        
        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 20)
        ])
        
        channelLabel.textColor = .white
        channelLabel.font = .systemFont(ofSize: 14)
    }
    
    private func setupProgress() {
        // Quality button
        setupButton(qualityButton, icon: "gear", action: #selector(qualityTapped))
        
        // Fullscreen button
        setupButton(fullscreenButton, icon: "arrow.up.left.and.arrow.down.right", action: #selector(fullscreenTapped))
    }
    
    private func setupGestures() {
        // Tap to show/hide controls
        tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tapGesture?.numberOfTapsRequired = 1
        addGestureRecognizer(tapGesture!)
        
        // Double tap for seek
        doubleTapGesture = UITapGestureRecognizer(target: self, action: #selector(handleDoubleTap))
        doubleTapGesture?.numberOfTapsRequired = 2
        addGestureRecognizer(doubleTapGesture!)
        
        // Require double tap to fail for single tap
        tapGesture?.require(toFail: doubleTapGesture!)
        
        // Pan for seek/volume/brightness
        panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
        addGestureRecognizer(panGesture!)
        
        // Pinch for zoom
        pinchGesture = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch))
        addGestureRecognizer(pinchGesture!)
    }
    
    private func setupNotifications() {
        hideTimerSubscription = controlsHideTimer.sink { [weak self] _ in
            if self?.isPlaying == true {
                self?.hideControls()
            }
        }
    }
    
    // MARK: - Button Actions
    
    @objc private func starTapped() {
        animateButton(starButton)
        starButton.tintColor = starButton.tintColor == .yellow ? .white : .yellow
        
        let message = starButton.tintColor == .yellow ? "Added to favorites" : "Removed from favorites"
        showToast(message)
        
        notifyButtonClick("star")
    }
    
    @objc private func commentTapped() {
        animateButton(commentButton)
        showComments()
        notifyButtonClick("comment")
    }
    
    @objc private func shareTapped() {
        animateButton(shareButton)
        shareVideo()
        notifyButtonClick("share")
    }
    
    @objc private func saveTapped() {
        animateButton(saveButton)
        saveButton.tintColor = .green
        
        UIView.animate(withDuration: 0.5) {
            self.saveButton.transform = CGAffineTransform(rotationAngle: .pi)
        } completion: { _ in
            self.saveButton.transform = .identity
        }
        
        showToast("Saved to watch later")
        notifyButtonClick("save")
    }
    
    @objc private func reportTapped() {
        animateButton(reportButton)
        showReportDialog()
        notifyButtonClick("report")
    }
    
    @objc private func supportTapped() {
        animateButton(supportButton)
        showSupport()
        notifyButtonClick("support")
    }
    
    @objc private func playPauseTapped() {
        animateButton(playPauseButton)
        isPlaying.toggle()
        
        let iconName = isPlaying ? "pause.fill" : "play.fill"
        playPauseButton.setImage(UIImage(systemName: iconName), for: .normal)
        
        if isPlaying {
            player?.play()
        } else {
            player?.pause()
        }
        
        // Reset hide timer
        resetHideTimer()
        
        notifyButtonClick(isPlaying ? "play" : "pause")
    }
    
    @objc private func qualityTapped() {
        animateButton(qualityButton)
        showQualityMenu()
    }
    
    @objc private func fullscreenTapped() {
        animateButton(fullscreenButton)
        isFullscreen.toggle()
        
        let iconName = isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right"
        fullscreenButton.setImage(UIImage(systemName: iconName), for: .normal)
        
        notifyButtonClick("fullscreen")
    }
    
    @objc private func progressChanged(_ sender: UISlider) {
        // Update position while sliding
        if let duration = player?.currentItem?.duration, duration.isNumeric {
            let newTime = CMTime(seconds: Double(sender.value) * duration.seconds, preferredTimescale: 600)
            currentPosition = newTime
            updateTimeDisplay()
        }
    }
    
    @objc private func progressTouchEnded(_ sender: UISlider) {
        // Seek to new position
        if let duration = player?.currentItem?.duration, duration.isNumeric {
            let newTime = CMTime(seconds: Double(sender.value) * duration.seconds, preferredTimescale: 600)
            player?.seek(to: newTime) { [weak self] _ in
                self?.currentPosition = newTime
            }
        }
    }
    
    // MARK: - Gesture Handlers
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        toggleControls()
    }
    
    @objc private func handleDoubleTap(_ gesture: UITapGestureRecognizer) {
        let location = gesture.location(in: self)
        let screenWidth = bounds.width
        
        if location.x < screenWidth / 3 {
            // Left side - seek back
            performSeek(seconds: -10)
            showSeekIndicator(seconds: -10)
        } else if location.x > 2 * screenWidth / 3 {
            // Right side - seek forward
            performSeek(seconds: 10)
            showSeekIndicator(seconds: 10)
        } else {
            // Center - play/pause
            playPauseTapped()
        }
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: self)
        let velocity = gesture.velocity(in: self)
        let location = gesture.location(in: self)
        
        switch gesture.state {
        case .began:
            // Start tracking
            break
            
        case .changed:
            let screenWidth = bounds.width
            let screenHeight = bounds.height
            
            if abs(translation.x) > abs(translation.y) {
                // Horizontal - seek
                let seekAmount = Double(translation.x / screenWidth) * (duration.seconds / 2)
                performSeek(seconds: -seekAmount)
            } else {
                // Vertical - volume/brightness
                let delta = Float(translation.y / screenHeight)
                
                if location.x < screenWidth / 2 {
                    // Left side - brightness
                    adjustBrightness(delta: -delta)
                } else {
                    // Right side - volume
                    adjustVolume(delta: -delta)
                }
            }
            
        case .ended:
            // Handle fling
            if abs(velocity.x) > 1000 {
                let seekAmount = velocity.x > 0 ? -30.0 : 30.0
                performSeek(seconds: seekAmount)
                showSeekIndicator(seconds: seekAmount)
            }
            
        default:
            break
        }
    }
    
    @objc private func handlePinch(_ gesture: UIPinchGestureRecognizer) {
        // Handle zoom
        if gesture.state == .changed {
            // Adjust video scale
        }
    }
    
    // MARK: - Helper Methods
    
    private func animateButton(_ button: UIButton) {
        UIView.animate(withDuration: 0.1) {
            button.transform = CGAffineTransform(scaleX: 1.2, y: 1.2)
        } completion: { _ in
            UIView.animate(withDuration: 0.1) {
                button.transform = .identity
            }
        }
    }
    
    private func toggleControls() {
        isControlsVisible ? hideControls() : showControls()
    }
    
    private func showControls() {
        isControlsVisible = true
        UIView.animate(withDuration: 0.3) {
            self.controlsOverlay.alpha = 1
        }
        resetHideTimer()
    }
    
    private func hideControls() {
        guard isPlaying else { return }
        isControlsVisible = false
        UIView.animate(withDuration: 0.3) {
            self.controlsOverlay.alpha = 0
        }
    }
    
    private func resetHideTimer() {
        hideTimerSubscription?.cancel()
        hideTimerSubscription = controlsHideTimer.sink { [weak self] _ in
            if self?.isPlaying == true {
                self?.hideControls()
            }
        }
    }
    
    private func startHideTimer() {
        resetHideTimer()
    }
    
    private func performSeek(seconds: Double) {
        guard let player = player, let duration = player.currentItem?.duration else { return }
        
        let newTime = min(max(currentPosition.seconds + seconds, 0), duration.seconds)
        let targetTime = CMTime(seconds: newTime, preferredTimescale: 600)
        
        player.seek(to: targetTime) { [weak self] _ in
            self?.currentPosition = targetTime
        }
        
        // Update progress slider
        progressSlider.value = Float(newTime / duration.seconds)
    }
    
    private func showSeekIndicator(seconds: Double) {
        // Create and show temporary seek indicator
        let indicator = UILabel()
        indicator.text = seconds > 0 ? "+\(Int(seconds))s" : "\(Int(seconds))s"
        indicator.textColor = .white
        indicator.font = .boldSystemFont(ofSize: 48)
        indicator.sizeToFit()
        indicator.center = center
        
        addSubview(indicator)
        
        UIView.animate(withDuration: 0.8) {
            indicator.alpha = 0
            indicator.transform = CGAffineTransform(scaleX: 1.5, y: 1.5)
        } completion: { _ in
            indicator.removeFromSuperview()
        }
    }
    
    private func adjustBrightness(delta: Float) {
        let newBrightness = max(0, min(1, UIScreen.main.brightness + CGFloat(delta)))
        UIScreen.main.brightness = newBrightness
        
        // Show brightness indicator
        showBrightnessIndicator(level: newBrightness)
    }
    
    private func adjustVolume(delta: Float) {
        let volumeView = MPVolumeView()
        if let slider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
            slider.value += delta
        }
        
        // Show volume indicator
        showVolumeIndicator(level: AVAudioSession.sharedInstance().outputVolume + delta)
    }
    
    private func showBrightnessIndicator(level: CGFloat) {
        // Show brightness overlay
    }
    
    private func showVolumeIndicator(level: Float) {
        // Show volume overlay
    }
    
    private func showToast(_ message: String) {
        let toast = UILabel()
        toast.text = message
        toast.textColor = .white
        toast.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        toast.textAlignment = .center
        toast.font = .systemFont(ofSize: 14)
        toast.sizeToFit()
        toast.frame.size.width += 40
        toast.frame.size.height += 20
        toast.center = CGPoint(x: bounds.midX, y: bounds.midY + 100)
        toast.layer.cornerRadius = 10
        toast.layer.masksToBounds = true
        
        addSubview(toast)
        
        UIView.animate(withDuration: 2.0) {
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
        }
    }
    
    private func showComments() {
        // Show comments section
        let commentsView = CommentsView(frame: bounds)
        commentsView.alpha = 0
        addSubview(commentsView)
        
        UIView.animate(withDuration: 0.3) {
            commentsView.alpha = 1
        }
    }
    
    private func shareVideo() {
        let items = ["Check out this video!"]
        let ac = UIActivityViewController(activityItems: items, applicationActivities: nil)
        
        if let viewController = findViewController() {
            viewController.present(ac, animated: true)
        }
    }
    
    private func showReportDialog() {
        let alert = UIAlertController(title: "Report Video", message: "Why are you reporting this video?", preferredStyle: .actionSheet)
        
        let reasons = ["Inappropriate content", "Spam", "Harassment", "Other"]
        reasons.forEach { reason in
            alert.addAction(UIAlertAction(title: reason, style: .default) { _ in
                self.showToast("Thank you for your report")
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        if let viewController = findViewController() {
            viewController.present(alert, animated: true)
        }
    }
    
    private func showSupport() {
        showToast("Opening support chat")
    }
    
    private func showQualityMenu() {
        let alert = UIAlertController(title: "Select Quality", message: nil, preferredStyle: .actionSheet)
        
        qualities.forEach { quality in
            alert.addAction(UIAlertAction(title: quality, style: .default) { _ in
                self.currentQuality = quality
                self.showToast("Quality: \(quality)")
                self.notifyQualityChange(quality)
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        if let viewController = findViewController() {
            viewController.present(alert, animated: true)
        }
    }
    
    private func findViewController() -> UIViewController? {
        var responder: UIResponder? = self
        while let nextResponder = responder?.next {
            if let viewController = nextResponder as? UIViewController {
                return viewController
            }
            responder = nextResponder
        }
        return nil
    }
    
    // MARK: - Public Methods
    
    func setPlayer(_ player: AVPlayer) {
        self.player = player
        playerLayer = AVPlayerLayer(player: player)
        playerLayer?.frame = videoContainerView.bounds
        playerLayer?.videoGravity = .resizeAspect
        
        if let playerLayer = playerLayer {
            videoContainerView.layer.addSublayer(playerLayer)
        }
        
        // Add time observer
        player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5), preferredTimescale: 600), queue: .main) { [weak self] time in
            self?.currentPosition = time
            self?.updateProgress()
        }
        
        // Observe duration
        if let duration = player.currentItem?.duration {
            self.duration = duration
            updateDuration()
        }
        
        // Observe buffer
        player.currentItem?.addObserver(self, forKeyPath: "loadedTimeRanges", options: .new, context: nil)
    }
    
    func setTitle(_ title: String) {
        titleLabel.text = title
    }
    
    func setChannelInfo(name: String, icon: UIImage?) {
        channelLabel.text = name
        // Update channel icon
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "loadedTimeRanges" {
            updateBufferProgress()
        }
    }
    
    private func updateProgress() {
        guard let duration = player?.currentItem?.duration, duration.isNumeric else { return }
        
        let progress = Float(currentPosition.seconds / duration.seconds)
        progressSlider.value = progress.isNaN ? 0 : progress
        
        updateTimeDisplay()
    }
    
    private func updateBufferProgress() {
        guard let playerItem = player?.currentItem else { return }
        
        if let bufferRange = playerItem.loadedTimeRanges.first?.timeRangeValue {
            let bufferEnd = CMTimeAdd(bufferRange.start, bufferRange.duration)
            let bufferProgress = Float(bufferEnd.seconds / duration.seconds)
            bufferProgressView.progress = bufferProgress.isNaN ? 0 : bufferProgress
        }
    }
    
    private func updateTimeDisplay() {
        currentTimeLabel.text = formatTime(currentPosition.seconds)
        durationLabel.text = formatTime(duration.seconds)
    }
    
    private func updateDuration() {
        durationLabel.text = formatTime(duration.seconds)
    }
    
    private func formatTime(_ seconds: Double) -> String {
        guard !seconds.isNaN && seconds.isFinite else { return "00:00" }
        
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
    
    private func notifyButtonClick(_ buttonId: String) {
        // Call C++ through bridge
    }
    
    private func notifyQualityChange(_ quality: String) {
        // Call C++ through bridge
    }
    
    deinit {
        player?.currentItem?.removeObserver(self, forKeyPath: "loadedTimeRanges")
        hideTimerSubscription?.cancel()
    }
}

// MARK: - Comments View

class CommentsView: UIView {
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = UIColor.black.withAlphaComponent(0.9)
        
        let tableView = UITableView()
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorColor = .darkGray
        
        addSubview(tableView)
        
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: topAnchor, constant: 60),
            tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -100)
        ])
        
        let closeButton = UIButton(type: .system)
        closeButton.setTitle("Close", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        
        addSubview(closeButton)
        
        NSLayoutConstraint.activate([
            closeButton.topAnchor.constraint(equalTo: topAnchor, constant: 20),
            closeButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            closeButton.widthAnchor.constraint(equalToConstant: 60),
            closeButton.heightAnchor.constraint(equalToConstant: 30)
        ])
    }
    
    @objc private func closeTapped() {
        UIView.animate(withDuration: 0.3) {
            self.alpha = 0
        } completion: { _ in
            self.removeFromSuperview()
        }
    }
}
