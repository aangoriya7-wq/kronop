import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import '../widgets/video_renderer.dart';
import '../models/reel.dart';

class ReelsScrollView extends StatefulWidget {
  final List<Reel> reels;
  final Function(Reel) onReelChanged;
  final Function(Reel) onStar;
  final Function(Reel) onComment;
  final Function(Reel) onShare;
  final Function(Reel) onSave;
  final Function(Reel) onSupport;
  
  const ReelsScrollView({
    Key? key,
    required this.reels,
    required this.onReelChanged,
    required this.onStar,
    required this.onComment,
    required this.onShare,
    required this.onSave,
    required this.onSupport,
  }) : super(key: key);
  
  @override
  State<ReelsScrollView> createState() => _ReelsScrollViewState();
}

class _ReelsScrollViewState extends State<ReelsScrollView> 
    with TickerProviderStateMixin {
  late PageController _pageController;
  late AnimationController _animationController;
  int _currentIndex = 0;
  bool _isScrolling = false;
  Timer? _fpsTimer;
  int _frameCount = 0;
  double _currentFPS = 0.0;
  
  @override
  void initState() {
    super.initState();
    _pageController = PageController(
      viewportFraction: 1.0,
      keepPage: true,
    );
    
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    
    // Monitor FPS
    _fpsTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _currentFPS = _frameCount.toDouble();
        _frameCount = 0;
      });
    });
    
    // Start FPS counter
    WidgetsBinding.instance.addPostFrameCallback(_startFPSMonitoring);
  }
  
  void _startFPSMonitoring(Duration timestamp) {
    _frameCount++;
    WidgetsBinding.instance.addPostFrameCallback(_startFPSMonitoring);
  }
  
  @override
  void dispose() {
    _pageController.dispose();
    _animationController.dispose();
    _fpsTimer?.cancel();
    super.dispose();
  }
  
  void _onPageChanged(int index) {
    if (index != _currentIndex) {
      setState(() {
        _currentIndex = index;
        _isScrolling = false;
      });
      
      widget.onReelChanged(widget.reels[index]);
      
      // Animate to new reel
      _animationController.forward().then((_) {
        _animationController.reset();
      });
    }
  }
  
  void _onPanStart(DragStartDetails details) {
    _isScrolling = true;
  }
  
  void _onPanEnd(DragEndDetails details) {
    // Custom physics for smooth scrolling
    final velocity = details.velocity.pixelsPerSecond.dy;
    final threshold = 500.0;
    
    if (velocity.abs() > threshold) {
      // Fling gesture
      final targetIndex = velocity > 0 
          ? (_currentIndex + 1).clamp(0, widget.reels.length - 1)
          : (_currentIndex - 1).clamp(0, widget.reels.length - 1);
      
      _animateToPage(targetIndex);
    } else {
      // Snap to current page
      _animateToPage(_currentIndex);
    }
  }
  
  void _animateToPage(int index) {
    if (index != _currentIndex) {
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Main reels view
          NotificationListener<ScrollNotification>(
            onNotification: (notification) {
              if (notification is ScrollStartNotification) {
                _isScrolling = true;
              } else if (notification is ScrollEndNotification) {
                Future.delayed(const Duration(milliseconds: 100), () {
                  if (mounted) {
                    setState(() {
                      _isScrolling = false;
                    });
                  }
                });
              }
              return false;
            },
            child: GestureDetector(
              onPanStart: _onPanStart,
              onPanEnd: _onPanEnd,
              child: PageView.builder(
                controller: _pageController,
                scrollDirection: Axis.vertical,
                onPageChanged: _onPageChanged,
                physics: const CustomScrollPhysics(),
                itemCount: widget.reels.length,
                itemBuilder: (context, index) {
                  final reel = widget.reels[index];
                  final isActive = index == _currentIndex && !_isScrolling;
                  
                  return RepaintBoundary(
                    child: ReelWidget(
                      reel: reel,
                      isActive: isActive,
                      onStar: () => widget.onStar(reel),
                      onComment: () => widget.onComment(reel),
                      onShare: () => widget.onShare(reel),
                      onSave: () => widget.onSave(reel),
                      onSupport: () => widget.onSupport(reel),
                    ),
                  );
                },
              ),
            ),
          ),
          
          // FPS indicator (for debugging)
          if (kDebugMode)
            Positioned(
              top: 50,
              right: 20,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'FPS: ${_currentFPS.toStringAsFixed(1)}',
                  style: const TextStyle(
                    color: Colors.green,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class CustomScrollPhysics extends ScrollPhysics {
  const CustomScrollPhysics({ScrollPhysics? parent}) : super(parent: parent);
  
  @override
  CustomScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return CustomScrollPhysics(parent: buildParent(ancestor));
  }
  
  @override
  SpringDescription get spring => const SpringDescription(
    mass: 50,
    stiffness: 100,
    damping: 1,
  );
  
  @override
  bool get allowImplicitScrolling => false;
}

class ReelWidget extends StatelessWidget {
  final Reel reel;
  final bool isActive;
  final VoidCallback onStar;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onSave;
  final VoidCallback onSupport;
  
  const ReelWidget({
    Key? key,
    required this.reel,
    required this.isActive,
    required this.onStar,
    required this.onComment,
    required this.onShare,
    required this.onSave,
    required this.onSupport,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Video renderer
        HighPerformanceVideoRenderer(
          videoUrl: reel.videoUrl,
          isActive: isActive,
        ),
        
        // Gradient overlay
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withOpacity(0.3),
                Colors.transparent,
                Colors.black.withOpacity(0.5),
              ],
            ),
          ),
        ),
        
        // UI overlay
        if (isActive)
          ReelOverlay(
            reel: reel,
            onStar: onStar,
            onComment: onComment,
            onShare: onShare,
            onSave: onSave,
            onSupport: onSupport,
          ),
      ],
    );
  }
}

class ReelOverlay extends StatelessWidget {
  final Reel reel;
  final VoidCallback onStar;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onSave;
  final VoidCallback onSupport;
  
  const ReelOverlay({
    Key? key,
    required this.reel,
    required this.onStar,
    required this.onComment,
    required this.onShare,
    required this.onSave,
    required this.onSupport,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Top section
        Expanded(
          flex: 1,
          child: Container(),
        ),
        
        // Bottom section with actions and info
        Container(
          height: 200,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // User info and description
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // User info
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: Colors.grey[300],
                          child: Text(
                            reel.username[0].toUpperCase(),
                            style: const TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                reel.username,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              if (reel.songName.isNotEmpty)
                                Text(
                                  '🎵 ${reel.songName}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Support button
                        GestureDetector(
                          onTap: onSupport,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: reel.isSupporting ? Colors.red : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              reel.isSupporting ? 'Following' : 'Follow',
                              style: TextStyle(
                                color: reel.isSupporting ? Colors.white : Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 12),
                    
                    // Description
                    if (reel.description.isNotEmpty)
                      Text(
                        reel.description,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              
              // Action buttons
              const SizedBox(width: 16),
              Column(
                children: [
                  // Star button
                  ActionButton(
                    icon: reel.isStarred ? Icons.star : Icons.star_border,
                    count: reel.stars,
                    onTap: onStar,
                    isActive: reel.isStarred,
                  ),
                  const SizedBox(height: 20),
                  
                  // Comment button
                  ActionButton(
                    icon: Icons.chat_bubble_outline,
                    count: reel.comments,
                    onTap: onComment,
                  ),
                  const SizedBox(height: 20),
                  
                  // Share button
                  ActionButton(
                    icon: Icons.share,
                    count: reel.shares,
                    onTap: onShare,
                  ),
                  const SizedBox(height: 20),
                  
                  // Save button
                  ActionButton(
                    icon: reel.isSaved ? Icons.bookmark : Icons.bookmark_border,
                    count: reel.saves,
                    onTap: onSave,
                    isActive: reel.isSaved,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ActionButton extends StatelessWidget {
  final IconData icon;
  final int count;
  final VoidCallback onTap;
  final bool isActive;
  
  const ActionButton({
    Key? key,
    required this.icon,
    required this.count,
    required this.onTap,
    this.isActive = false,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.red : Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            count.toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
