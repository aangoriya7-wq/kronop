import React, { useState } from 'react';

import {

  View,

  Text,

  TextInput,

  TouchableOpacity,

  StyleSheet,

  Modal,

  FlatList,

  Image,

  KeyboardAvoidingView,

  Platform,

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';



const MOCK_COMMENTS = [

  {

    id: '1',

    username: 'raj_123',

    userAvatar: 'https://i.pravatar.cc/150?img=5',

    text: 'Awesome stream! 🔥',

    time: '2m ago',

  },

  {

    id: '2',

    username: 'priya_kaur',

    userAvatar: 'https://i.pravatar.cc/150?img=6',

    text: 'First time here, loving it! 🎉',

    time: '5m ago',

  },

  {

    id: '3',

    username: 'vicky_gamer',

    userAvatar: 'https://i.pravatar.cc/150?img=7',

    text: 'Can you play some music? 🎵',

    time: '10m ago',

  },

];



export default function Comment({ streamId }) {

  const [modalVisible, setModalVisible] = useState(false);

  const [comments, setComments] = useState(MOCK_COMMENTS);

  const [newComment, setNewComment] = useState('');



  const sendComment = () => {

    if (newComment.trim()) {

      const comment = {

        id: Date.now().toString(),

        username: 'you',

        userAvatar: 'https://i.pravatar.cc/150?img=8',

        text: newComment.trim(),

        time: 'just now',

      };

      setComments([comment, ...comments]);

      setNewComment('');

    }

  };



  return (

    <>

      <TouchableOpacity 

        style={styles.container}

        onPress={() => setModalVisible(true)}

      >

        <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />

        <Text style={styles.count}>{comments.length}</Text>

      </TouchableOpacity>



      <Modal

        animationType="slide"

        transparent={true}

        visible={modalVisible}

        onRequestClose={() => setModalVisible(false)}

      >

        <KeyboardAvoidingView 

          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

          style={styles.modalContainer}

        >

          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>

              <Text style={styles.modalTitle}>Comments</Text>

              <TouchableOpacity onPress={() => setModalVisible(false)}>

                <Ionicons name="close" size={24} color="#FFFFFF" />

              </TouchableOpacity>

            </View>



            <FlatList

              data={comments}

              keyExtractor={item => item.id}

              showsVerticalScrollIndicator={false}

              style={styles.commentsList}

              renderItem={({ item }) => (

                <View style={styles.commentItem}>

                  <Image source={{ uri: item.userAvatar }} style={styles.avatar} />

                  <View style={styles.commentContent}>

                    <View style={styles.commentHeader}>

                      <Text style={styles.username}>{item.username}</Text>

                      <Text style={styles.time}>{item.time}</Text>

                    </View>

                    <Text style={styles.commentText}>{item.text}</Text>

                  </View>

                </View>

              )}

            />



            <View style={styles.inputContainer}>

              <Image 

                source={{ uri: 'https://i.pravatar.cc/150?img=8' }} 

                style={styles.inputAvatar} 

              />

              <TextInput

                style={styles.input}

                placeholder="Add a comment..."

                placeholderTextColor="#999"

                value={newComment}

                onChangeText={setNewComment}

                onSubmitEditing={sendComment}

              />

              <TouchableOpacity onPress={sendComment}>

                <Ionicons name="send" size={24} color="#6C5CE7" />

              </TouchableOpacity>

            </View>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </>

  );

}



const styles = StyleSheet.create({

  container: {

    alignItems: 'flex-end',

    backgroundColor: 'transparent',

    paddingHorizontal: 6,

    paddingVertical: 4,

    borderRadius: 30,

    minWidth: 50,

  },

  count: {

    color: '#FFFFFF',

    fontSize: 12,

    marginTop: 4,

    fontWeight: '600',

    textShadowColor: 'rgba(0, 0, 0, 0.8)',

    textShadowOffset: { width: 1, height: 1 },

    textShadowRadius: 2,

  },

  modalContainer: {

    flex: 1,

    justifyContent: 'flex-end',

    backgroundColor: 'rgba(0, 0, 0, 0.5)',

  },

  modalContent: {

    backgroundColor: '#1a1a1a',

    borderTopLeftRadius: 20,

    borderTopRightRadius: 20,

    height: '80%',

    paddingTop: 16,

  },

  modalHeader: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingBottom: 12,

    borderBottomWidth: 1,

    borderBottomColor: '#333',

  },

  modalTitle: {

    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: 'bold',

  },

  commentsList: {

    flex: 1,

    paddingHorizontal: 16,

  },

  commentItem: {

    flexDirection: 'row',

    marginBottom: 16,

    paddingVertical: 8,

  },

  avatar: {

    width: 36,

    height: 36,

    borderRadius: 18,

    marginRight: 12,

  },

  commentContent: {

    flex: 1,

  },

  commentHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 4,

  },

  username: {

    color: '#6C5CE7',

    fontSize: 14,

    fontWeight: '600',

    marginRight: 8,

  },

  time: {

    color: '#999',

    fontSize: 11,

  },

  commentText: {

    color: '#FFFFFF',

    fontSize: 14,

  },

  inputContainer: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

    borderTopWidth: 1,

    borderTopColor: '#333',

    backgroundColor: '#1a1a1a',

  },

  inputAvatar: {

    width: 32,

    height: 32,

    borderRadius: 16,

    marginRight: 10,

  },

  input: {

    flex: 1,

    backgroundColor: '#333',

    borderRadius: 20,

    paddingHorizontal: 16,

    paddingVertical: 8,

    marginRight: 10,

    color: '#FFFFFF',

    fontSize: 14,

  },

});