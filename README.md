# PDF Note Taking App

A professional PDF annotation and note-taking application with smooth handwriting support, perfect for lectures and Arabic script.

## ✨ Features

- **PDF Viewing**: Upload and view PDF files with zoom and page navigation
- **Smooth Handwriting**: Professional-grade pen with Catmull-Rom spline smoothing
- **Arabic Support**: Full RTL layout and Arabic font support for handwriting
- **Drawing Tools**:
  - **Three Professional Pen Styles**:
    - ✍️ **Writing**: Smooth, consistent strokes for general note-taking
    - 🎨 **Drawing**: Textured, artistic strokes with depth
    - 🖋️ **Calligraphy**: Elegant variable-width strokes (thin horizontal, thick vertical/diagonal)
  - Customizable colors and sizes (1-20px)
  - Single-click dot placement
  - Drag-to-erase functionality
  - Undo/Redo support
- **Save Annotations**: Export PDF with all your handwritten notes permanently embedded
- **Multi-Page Support**: Annotations are saved per page and persist when navigating
- **Touch Support**: Works with mouse, stylus, and touch input
- **Keyboard Shortcuts**: Quick access to common actions
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📖 Usage

1. **Upload PDF**: Click or drag-and-drop a PDF file
2. **Navigate**: Use Previous/Next buttons to switch pages
3. **Select Pen Style**: Choose from Writing (smooth lines), Drawing (textured), or Calligraphy (variable width based on stroke direction)
4. **Draw**: Select the pen tool and draw on the PDF
5. **Customize**: Change pen color and size
6. **Erase**: Switch to eraser and drag over lines to remove them
7. **Undo/Redo**: Use buttons or keyboard shortcuts
8. **Save**: Click the "💾 Save PDF" button to download your annotated PDF
   - All pages with annotations will be saved
   - Original PDF is preserved with notes embedded
   - Downloaded as `[filename]_annotated.pdf`

## ⌨️ Keyboard Shortcuts

- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `Ctrl+P` - Switch to Pen
- `Ctrl+E` - Switch to Eraser
- `1-9` - Quick pen size (1-9px)

## 🎨 Technical Highlights

- **High DPI Support**: Crisp rendering on Retina/4K displays
- **Anti-aliasing**: Smooth, professional-looking lines
- **Catmull-Rom Splines**: Natural curve interpolation
- **Optimized Performance**: Efficient canvas rendering
- **React + TypeScript**: Type-safe, modern architecture

## 📱 Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🛠️ Built With

- React 19
- TypeScript
- Vite
- react-pdf
- PDF.js
- HTML5 Canvas

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 💡 Tips for Best Experience

- Use a stylus or pen tablet for the best handwriting experience
- Zoom in for detailed annotations
- Use smaller pen sizes for fine writing
- Switch to RTL mode (عربي button) for Arabic handwriting
- Clear canvas before changing pages to keep annotations organized

---

Made with ❤️ for students and professionals who need to annotate PDFs during lectures.
