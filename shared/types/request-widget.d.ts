/**
 * Interface représentant une requ00eate de widget
 */
export interface RequestWidget {
  _id?: string;
  query?: Record<string, any>;
  widgetId?: string | any; // Schema.Types.ObjectId
  total?: number;
  missions?: string[];
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
