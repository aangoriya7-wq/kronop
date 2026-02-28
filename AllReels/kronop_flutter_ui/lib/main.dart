import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'src/widgets/reels_scroll_view.dart';
import 'src/models/reel.dart';
import 'src/services/nodejs_bridge.dart';
import 'src/ffi/kronop_engine_ffi.dart';

void main() {
  runApp(const ReelsApp());
}

class ReelsApp extends StatelessWidget {
  const ReelsApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kronop Reels',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ReelsProvider()),
          ChangeNotifierProvider(create: (_) => VideoEngineProvider()),
        ],
        child: const ReelsHomePage(),
      ),
    );
  }
}

class ReelsProvider extends ChangeNotifier {
  List<Reel> _reels = [];
  bool _isLoading = false;
  String? _error;
  
  List<Reel> get reels => _reels;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  Future<void> loadReels() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      // Mock data for now - in real app, this would come from API
      _reels = [
        Reel(
          id: '1',
          videoUrl: 'https://example.com/video1.mp4',
          username: 'user1',
          description: 'Amazing video content! #trending #viral',
          songName: 'Popular Song - Artist',
          stars: 1250,
          comments: 89,
          shares: 45,
          saves: 234,
        ),
        Reel(
          id: '2',
          videoUrl: 'https://example.com/video2.mp4',
          username: 'creator2',
          description: 'Check out this cool effect',
          songName: 'Background Music - DJ',
          stars: 890,
          comments: 56,
          shares: 23,
          saves: 167,
        ),
        Reel(
          id: '3',
          videoUrl: 'https://example.com/video3.mp4',
          username: 'influencer3',
          description: 'Daily vlog content',
          songName: 'Trending Audio',
          stars: 2340,
          comments: 234,
          shares: 123,
          saves: 567,
        ),
      ];
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }
  
  void updateReel(Reel updatedReel) {
    final index = _reels.indexWhere((reel) => reel.id == updatedReel.id);
    if (index != -1) {
      _reels[index] = updatedReel;
      notifyListeners();
    }
  }
  
  Future<void> starReel(String reelId) async {
    final index = _reels.indexWhere((reel) => reel.id == reelId);
    if (index != -1) {
      final reel = _reels[index];
      final updatedReel = reel.copyWith(
        isStarred: !reel.isStarred,
        stars: reel.isStarred ? reel.stars - 1 : reel.stars + 1,
      );
      updateReel(updatedReel);
    }
  }
  
  Future<void> commentOnReel(String reelId) async {
    final index = _reels.indexWhere((reel) => reel.id == reelId);
    if (index != -1) {
      final reel = _reels[index];
      final updatedReel = reel.copyWith(comments: reel.comments + 1);
      updateReel(updatedReel);
    }
  }
  
  Future<void> shareReel(String reelId) async {
    final index = _reels.indexWhere((reel) => reel.id == reelId);
    if (index != -1) {
      final reel = _reels[index];
      final updatedReel = reel.copyWith(shares: reel.shares + 1);
      updateReel(updatedReel);
    }
  }
  
  Future<void> saveReel(String reelId) async {
    final index = _reels.indexWhere((reel) => reel.id == reelId);
    if (index != -1) {
      final reel = _reels[index];
      final updatedReel = reel.copyWith(
        isSaved: !reel.isSaved,
        saves: reel.isSaved ? reel.saves - 1 : reel.saves + 1,
      );
      updateReel(updatedReel);
    }
  }
  
  Future<void> supportCreator(String reelId) async {
    final index = _reels.indexWhere((reel) => reel.id == reelId);
    if (index != -1) {
      final reel = _reels[index];
      final updatedReel = reel.copyWith(isSupporting: !reel.isSupporting);
      updateReel(updatedReel);
    }
  }
}

class VideoEngineProvider extends ChangeNotifier {
  VideoEngine? _engine;
  bool _isInitialized = false;
  bool _isConnected = false;
  NodeJSBridge? _nodeJSBridge;
  
  VideoEngine? get engine => _engine;
  bool get isInitialized => _isInitialized;
  bool get isConnected => _isConnected;
  NodeJSBridge? get nodeJSBridge => _nodeJSBridge;
  
  Future<void> initialize() async {
    try {
      _engine = VideoEngine();
      _isInitialized = await _engine!.initialize();
      
      if (_isInitialized) {
        await _engine!.start();
        
        // Initialize Node.js bridge
        _nodeJSBridge = NodeJSBridge();
        _isConnected = await _nodeJSBridge!.connect('ws://localhost:8080');
      }
      
      notifyListeners();
    } catch (e) {
      print('Failed to initialize video engine: $e');
      notifyListeners();
    }
  }
  
  @override
  void dispose() {
    _engine?.dispose();
    _nodeJSBridge?.dispose();
    super.dispose();
  }
}

class ReelsHomePage extends StatefulWidget {
  const ReelsHomePage({Key? key}) : super(key: key);
  
  @override
  State<ReelsHomePage> createState() => _ReelsHomePageState();
}

class _ReelsHomePageState extends State<ReelsHomePage> {
  @override
  void initState() {
    super.initState();
    
    // Initialize video engine
    context.read<VideoEngineProvider>().initialize();
    
    // Load reels
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReelsProvider>().loadReels();
    });
  }
  
  @override
  Widget build(BuildContext context) {
    final reelsProvider = context.watch<ReelsProvider>();
    final videoEngineProvider = context.watch<VideoEngineProvider>();
    
    if (reelsProvider.isLoading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(
            color: Colors.white,
          ),
        ),
      );
    }
    
    if (reelsProvider.error != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                color: Colors.red,
                size: 64,
              ),
              const SizedBox(height: 16),
              Text(
                'Error: ${reelsProvider.error}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => reelsProvider.loadReels(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }
    
    if (reelsProvider.reels.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text(
            'No reels available',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
            ),
          ),
        ),
      );
    }
    
    return ReelsScrollView(
      reels: reelsProvider.reels,
      onReelChanged: (reel) {
        // Handle reel change
        print('Current reel: ${reel.username}');
      },
      onStar: (reel) => reelsProvider.starReel(reel.id),
      onComment: (reel) => reelsProvider.commentOnReel(reel.id),
      onShare: (reel) => reelsProvider.shareReel(reel.id),
      onSave: (reel) => reelsProvider.saveReel(reel.id),
      onSupport: (reel) => reelsProvider.supportCreator(reel.id),
    );
  }
}
