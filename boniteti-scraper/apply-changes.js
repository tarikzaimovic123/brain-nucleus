#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Logger
const log = {
  info: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.blue(`[INFO] ${msg}`));
    } else {
      process.stderr.write(`[INFO] ${msg}\n`);
    }
  },
  success: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.green(`[SUCCESS] ${msg}`));
    } else {
      process.stderr.write(`[SUCCESS] ${msg}\n`);
    }
  },
  error: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.red(`[ERROR] ${msg}`));
    } else {
      process.stderr.write(`[ERROR] ${msg}\n`);
    }
  }
};

async function applyChanges() {
  try {
    log.info('Starting to apply changes to database...');
    
    // Get the comparison data from stdin
    let inputData = '';
    
    if (process.stdin.isTTY) {
      // If running directly, just return success
      log.success('No changes to apply (direct run)');
      if (process.env.RETURN_JSON) {
        console.log(JSON.stringify({ success: true, message: 'No changes to apply' }));
      }
      return;
    }
    
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }
    
    if (!inputData) {
      log.error('No input data provided');
      process.exit(1);
    }
    
    const { comparison, stats } = JSON.parse(inputData);
    
    log.info(`Processing ${stats.new} new, ${stats.updated} updated, ${stats.deleted} deleted activities`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Apply new activities
    if (comparison.new && comparison.new.length > 0) {
      log.info(`Adding ${comparison.new.length} new activities...`);
      for (const activity of comparison.new) {
        try {
          const { error } = await supabase.rpc('upsert_activity', {
            p_activity_id: activity.activity_id,
            p_code: activity.code,
            p_name: activity.name,
            p_full_text: activity.full_text,
            p_parent_id: activity.parent_id,
            p_country: 'Crna Gora'
          });
          
          if (error) throw error;
          successCount++;
        } catch (error) {
          log.error(`Failed to add activity ${activity.code}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // Apply updated activities
    if (comparison.updated && comparison.updated.length > 0) {
      log.info(`Updating ${comparison.updated.length} activities...`);
      for (const activity of comparison.updated) {
        try {
          const { error } = await supabase.rpc('upsert_activity', {
            p_activity_id: activity.activity_id,
            p_code: activity.code,
            p_name: activity.name,
            p_full_text: activity.full_text,
            p_parent_id: activity.parent_id,
            p_country: 'Crna Gora'
          });
          
          if (error) throw error;
          successCount++;
        } catch (error) {
          log.error(`Failed to update activity ${activity.code}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // Delete removed activities
    if (comparison.deleted && comparison.deleted.length > 0) {
      log.info(`Removing ${comparison.deleted.length} activities...`);
      for (const activity of comparison.deleted) {
        try {
          const { error } = await supabase
            .from('activities')
            .delete()
            .eq('activity_id', activity.activity_id);
          
          if (error) throw error;
          successCount++;
        } catch (error) {
          log.error(`Failed to delete activity ${activity.code}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // Update hierarchy levels
    try {
      await supabase.rpc('update_activity_levels');
      log.info('Updated activity hierarchy levels');
    } catch (error) {
      log.error(`Failed to update levels: ${error.message}`);
    }
    
    log.success(`Changes applied successfully! ${successCount} successful, ${errorCount} errors`);
    
    if (process.env.RETURN_JSON) {
      console.log(JSON.stringify({
        success: true,
        message: 'Changes applied to database',
        stats: { successCount, errorCount }
      }));
    }
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    if (process.env.RETURN_JSON) {
      console.log(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    process.exit(1);
  }
}

// Run
applyChanges().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});