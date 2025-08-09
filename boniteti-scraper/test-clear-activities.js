#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function clearSomeActivities() {
  try {
    console.log(chalk.yellow('Deleting some activities to test the sync...'));
    
    // Delete activities with code starting with 'S' (for testing)
    const { data, error } = await supabase
      .from('activities')
      .delete()
      .ilike('code', 'S%');
    
    if (error) throw error;
    
    console.log(chalk.green('✅ Deleted activities with code starting with S'));
    
    // Count remaining activities
    const { count } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
    
    console.log(chalk.blue(`Remaining activities in database: ${count}`));
    
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
  }
}

clearSomeActivities();