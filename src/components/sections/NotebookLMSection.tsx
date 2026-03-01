import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags: string[];
}

interface NotebookLMSectionProps {
  onNoteCreated?: (note: Note) => void;
}

const NotebookLMSection: React.FC<NotebookLMSectionProps> = ({ onNoteCreated }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');

  const openNativeNotes = () => {
    // Open native notes app directly
    Linking.openURL('content://com.android.providers.media.documents/note');
  };

  const openNotesApp = () => {
    // Alternative: Try to open notes app
    Alert.alert(
      'Open Notebook',
      'Notes app will open directly. Create notes and they will be available here.',
      [
        {
          text: 'Open Notes',
          onPress: openNativeNotes,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const createNote = () => {
    if (!newNoteTitle.trim()) {
      Alert.alert('Error', 'Please enter a note title');
      return;
    }

    const tags = newNoteTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const newNote: Note = {
      id: Date.now().toString(),
      title: newNoteTitle,
      content: newNoteContent,
      createdAt: new Date().toLocaleString(),
      tags: tags,
    };

    setNotes(prev => [newNote, ...prev]);
    onNoteCreated?.(newNote);

    // Reset form
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags('');
    setShowCreateForm(false);

    Alert.alert('Success', 'Note created successfully!');
  };

  const deleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            setNotes(prev => prev.filter(note => note.id !== id));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderNote = (note: Note) => (
    <View key={note.id} style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.noteTitleContainer}>
          <Ionicons name="bookmark" size={20} color="#4A2C5F" />
          <Text style={styles.noteTitle}>{note.title}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteNote(note.id)}>
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {note.content ? (
        <Text style={styles.noteContent} numberOfLines={3}>
          {note.content}
        </Text>
      ) : null}

      {note.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {note.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.noteDate}>Created: {note.createdAt}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="school" size={24} color="#4A2C5F" />
        <Text style={styles.title}>NotebookLM</Text>
      </View>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={openNotesApp}
      >
        <Ionicons name="school-outline" size={24} color="#4A2C5F" />
        <Text style={styles.createButtonText}>
          Open Notes App
        </Text>
      </TouchableOpacity>

      {showCreateForm && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="Note title *"
            value={newNoteTitle}
            onChangeText={setNewNoteTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Note content..."
            value={newNoteContent}
            onChangeText={setNewNoteContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TextInput
            style={styles.input}
            placeholder="Tags (comma separated, e.g., work, ideas, project)"
            value={newNoteTags}
            onChangeText={setNewNoteTags}
          />
          <TouchableOpacity style={styles.saveButton} onPress={createNote}>
            <Text style={styles.saveButtonText}>Save Note</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.notesList}>
        {notes.length > 0 ? (
          notes.map(renderNote)
        ) : (
          <Text style={styles.emptyText}>No notes yet. Create your first note!</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A2C5F',
    marginLeft: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonText: {
    marginLeft: 8,
    color: '#4A2C5F',
    fontSize: 14,
    fontWeight: '500',
  },
  createForm: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#4A2C5F',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesList: {
    maxHeight: 300,
  },
  noteCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  noteContent: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#E8E0ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#4A2C5F',
    fontSize: 11,
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
});

export default NotebookLMSection;
