interface CategoryCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  isActive?: boolean;
}

export default function CategoryCard({ title, description, icon, onClick, isActive = false }: CategoryCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive 
          ? 'border-red-600 bg-red-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-red-200'
      }`}
    >
      <div className="text-4xl mb-4 text-center">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">{title}</h3>
      <p className="text-gray-600 text-center text-sm">{description}</p>
    </div>
  );
}