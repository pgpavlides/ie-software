interface CategoryCardProps {
  title: string;
  description: string;
  iconPath: string;
  onClick: () => void;
  isActive?: boolean;
}

export default function CategoryCard({ title, description, iconPath, onClick, isActive = false }: CategoryCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive 
          ? 'border-red-600 bg-red-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-red-200'
      }`}
    >
      <div className="mb-4 text-center">
        <img 
          src={iconPath} 
          alt={`${title} icon`}
          className="w-12 h-12 mx-auto object-contain transition-all duration-200"
          style={{
            filter: isActive 
              ? 'brightness(0) invert(1)' // White when active
              : 'brightness(0) saturate(100%) invert(19%) sepia(84%) saturate(3951%) hue-rotate(346deg) brightness(91%) contrast(103%)' // Red (#ea2127)
          }}
        />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">{title}</h3>
      <p className="text-gray-600 text-center text-sm">{description}</p>
    </div>
  );
}