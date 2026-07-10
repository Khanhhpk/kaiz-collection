export function createDraggableList(options) {
  const {
    $container,
    itemSelector,
    onReorder,
    getItems,
    setItems,
  } = options;

  let draggedElement = null;
  let touchStartY = 0;

  function handleDragStart(e) {
    draggedElement = this;
    $(this).addClass('dragging');
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    e.originalEvent.dataTransfer.setData('text/html', this.innerHTML);
  }

  function handleDragEnd(e) {
    $(this).removeClass('dragging');
    $(`${itemSelector}`).removeClass('drag-over');
    draggedElement = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.originalEvent.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    if (this !== draggedElement) {
      $(this).addClass('drag-over');
    }
  }

  function handleDragLeave(e) {
    $(this).removeClass('drag-over');
  }

  function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    if (draggedElement !== this) {
      $(this).removeClass('drag-over');
      
      const fromUid = parseInt($(draggedElement).data('uid')) || parseInt($(draggedElement).data('script-id')) || parseInt($(draggedElement).data('regex-id'));
      const toUid = parseInt($(this).data('uid')) || parseInt($(this).data('script-id')) || parseInt($(this).data('regex-id'));
      
      const items = getItems();
      const fromIndex = items.findIndex(item => {
        const itemId = item.uid || item.id || item.script_id || item.regex_id;
        return itemId === fromUid;
      });
      const toIndex = items.findIndex(item => {
        const itemId = item.uid || item.id || item.script_id || item.regex_id;
        return itemId === toUid;
      });
      
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        onReorder(items);
      }
    }
    return false;
  }

  function handleTouchStart(e) {
    touchStartY = e.originalEvent.touches[0].clientY;
    $(this).addClass('touch-dragging');
  }

  function handleTouchMove(e) {
    e.preventDefault();
  }

  function handleTouchEnd(e) {
    $(this).removeClass('touch-dragging');
    
    const touchEndY = e.originalEvent.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaY) > 50) {
      const items = $container.find(itemSelector);
      const currentIndex = items.index(this);
      let targetIndex = currentIndex;
      
      if (deltaY < 0) {
        targetIndex = Math.max(0, currentIndex - 1);
      } else {
        targetIndex = Math.min(items.length - 1, currentIndex + 1);
      }
      
      if (currentIndex !== targetIndex) {
        const fromUid = parseInt($(this).data('uid')) || parseInt($(this).data('script-id')) || parseInt($(this).data('regex-id'));
        const toUid = parseInt($(items[targetIndex]).data('uid')) || parseInt($(items[targetIndex]).data('script-id')) || parseInt($(items[targetIndex]).data('regex-id'));
        
        const itemsArray = getItems();
        const fromIndex = itemsArray.findIndex(item => {
          const itemId = item.uid || item.id || item.script_id || item.regex_id;
          return itemId === fromUid;
        });
        const toIndex = itemsArray.findIndex(item => {
          const itemId = item.uid || item.id || item.script_id || item.regex_id;
          return itemId === toUid;
        });
        
        if (fromIndex !== -1 && toIndex !== -1) {
          const [movedItem] = itemsArray.splice(fromIndex, 1);
          itemsArray.splice(toIndex, 0, movedItem);
          onReorder(itemsArray);
        }
      }
    }
  }

  function init() {
    $container.on('dragstart', itemSelector, handleDragStart);
    $container.on('dragend', itemSelector, handleDragEnd);
    $container.on('dragover', itemSelector, handleDragOver);
    $container.on('drop', itemSelector, handleDrop);
    $container.on('dragenter', itemSelector, handleDragEnter);
    $container.on('dragleave', itemSelector, handleDragLeave);
    
    $container.on('touchstart', itemSelector, handleTouchStart);
    $container.on('touchmove', itemSelector, handleTouchMove);
    $container.on('touchend', itemSelector, handleTouchEnd);
  }

  function destroy() {
    $container.off();
  }

  init();

  return {
    destroy,
  };
}