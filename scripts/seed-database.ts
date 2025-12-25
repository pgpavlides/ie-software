import { createClient } from '@supabase/supabase-js';
import { escapeRoomTypes } from '../src/data/data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('Starting database seed...');

  try {
    // Insert escape room types
    for (const escapeRoomType of escapeRoomTypes) {
      console.log(`\nProcessing escape room type: ${escapeRoomType.name}`);

      const { data: typeData, error: typeError } = await supabase
        .from('escape_room_types')
        .upsert({
          id: escapeRoomType.id,
          name: escapeRoomType.name,
          description: escapeRoomType.description
        }, { onConflict: 'id' })
        .select();

      if (typeError) {
        console.error(`Error inserting escape room type ${escapeRoomType.name}:`, typeError);
        continue;
      }

      console.log(`✓ Inserted escape room type: ${escapeRoomType.name}`);

      // Insert cities for this escape room type
      for (const city of escapeRoomType.cities) {
        console.log(`  Processing city: ${city.name}, ${city.country}`);

        const { data: cityData, error: cityError } = await supabase
          .from('cities')
          .upsert({
            name: city.name,
            country: city.country,
            escape_room_type_id: escapeRoomType.id
          }, { onConflict: 'name,country,escape_room_type_id' })
          .select()
          .single();

        if (cityError) {
          console.error(`  Error inserting city ${city.name}:`, cityError);
          continue;
        }

        console.log(`  ✓ Inserted city: ${city.name}`);

        // Insert rooms for this city
        for (const room of city.rooms) {
          const { error: roomError } = await supabase
            .from('rooms')
            .upsert({
              name: room.name,
              anydesk: room.anydesk,
              ip: room.ip || null,
              notes: room.notes || null,
              city_id: cityData.id
            });

          if (roomError) {
            console.error(`    Error inserting room ${room.name}:`, roomError);
          }
        }

        console.log(`  ✓ Inserted ${city.rooms.length} rooms for ${city.name}`);
      }
    }

    console.log('\n✅ Database seed completed successfully!');

    // Print summary
    const { count: typesCount } = await supabase
      .from('escape_room_types')
      .select('*', { count: 'exact', head: true });

    const { count: citiesCount } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });

    const { count: roomsCount } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Summary:');
    console.log(`   Escape Room Types: ${typesCount}`);
    console.log(`   Cities: ${citiesCount}`);
    console.log(`   Rooms: ${roomsCount}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
