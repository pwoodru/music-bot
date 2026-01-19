export class Queue<T> {
    private items: T[] = [];
  
    enqueue(item: T) {
      this.items.push(item);
    }
  
    dequeue(): T | undefined {
      return this.items.shift();
    }
  
    clear() {
      this.items = [];
    }
  
    get length() {
      return this.items.length;
    }

    getAll(): T[] {
      return [...this.items];
    }

    peek(): T | undefined {
      return this.items[0];
    }
  }
  