class Reel {
  final String id;
  final String videoUrl;
  final String username;
  final String description;
  final String songName;
  final int stars;
  final int comments;
  final int shares;
  final int saves;
  final bool isStarred;
  final bool isSaved;
  final bool isSupporting;
  final DateTime createdAt;
  
  Reel({
    required this.id,
    required this.videoUrl,
    required this.username,
    required this.description,
    required this.songName,
    required this.stars,
    required this.comments,
    required this.shares,
    required this.saves,
    this.isStarred = false,
    this.isSaved = false,
    this.isSupporting = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
  
  factory Reel.fromJson(Map<String, dynamic> json) {
    return Reel(
      id: json['id'] as String,
      videoUrl: json['videoUrl'] as String,
      username: json['username'] as String,
      description: json['description'] as String? ?? '',
      songName: json['songName'] as String? ?? '',
      stars: json['stars'] as int? ?? 0,
      comments: json['comments'] as int? ?? 0,
      shares: json['shares'] as int? ?? 0,
      saves: json['saves'] as int? ?? 0,
      isStarred: json['isStarred'] as bool? ?? false,
      isSaved: json['isSaved'] as bool? ?? false,
      isSupporting: json['isSupporting'] as bool? ?? false,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'videoUrl': videoUrl,
      'username': username,
      'description': description,
      'songName': songName,
      'stars': stars,
      'comments': comments,
      'shares': shares,
      'saves': saves,
      'isStarred': isStarred,
      'isSaved': isSaved,
      'isSupporting': isSupporting,
      'createdAt': createdAt.toIso8601String(),
    };
  }
  
  Reel copyWith({
    String? id,
    String? videoUrl,
    String? username,
    String? description,
    String? songName,
    int? stars,
    int? comments,
    int? shares,
    int? saves,
    bool? isStarred,
    bool? isSaved,
    bool? isSupporting,
    DateTime? createdAt,
  }) {
    return Reel(
      id: id ?? this.id,
      videoUrl: videoUrl ?? this.videoUrl,
      username: username ?? this.username,
      description: description ?? this.description,
      songName: songName ?? this.songName,
      stars: stars ?? this.stars,
      comments: comments ?? this.comments,
      shares: shares ?? this.shares,
      saves: saves ?? this.saves,
      isStarred: isStarred ?? this.isStarred,
      isSaved: isSaved ?? this.isSaved,
      isSupporting: isSupporting ?? this.isSupporting,
      createdAt: createdAt ?? this.createdAt,
    );
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Reel && other.id == id;
  }
  
  @override
  int get hashCode => id.hashCode;
  
  @override
  String toString() {
    return 'Reel(id: $id, username: $username, stars: $stars)';
  }
}
